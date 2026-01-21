using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers;

[Route("order-items")]
[Authorize(Roles = Roles.Admin)]
public class OrderItemController(DatabaseContext context) : BaseController(context)
{
    /// <summary>
    /// Get all order items (admin only)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderItemResponse>>> GetAllOrderItems(
        [FromQuery] Guid? orderId = null,
        [FromQuery] Guid? variantId = null
    )
    {
        var query = Context.OrderItems.AsQueryable();

        if (orderId.HasValue)
            query = query.Where(i => i.OrderId == orderId.Value);

        if (variantId.HasValue)
            query = query.Where(i => i.VariantId == variantId.Value);

        var items = await query
            .Include(i => i.Variant)
                .ThenInclude(v => v.Product)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new OrderItemResponse(
                i.Id,
                i.OrderId,
                i.VariantId,
                i.RequestId,
                i.Variant.Product.Name,
                i.Variant.Size,
                i.Variant.Color,
                i.Quantity,
                i.UnitPrice,
                i.Subtotal,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>
    /// Get a specific order item by ID (admin only)
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderItemResponse>> GetOrderItem(Guid id)
    {
        var item = await Context
            .OrderItems.Include(i => i.Variant)
                .ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (item == null)
            return NotFound(new { message = "Order item not found" });

        return Ok(
            new OrderItemResponse(
                item.Id,
                item.OrderId,
                item.VariantId,
                item.RequestId,
                item.Variant.Product.Name,
                item.Variant.Size,
                item.Variant.Color,
                item.Quantity,
                item.UnitPrice,
                item.Subtotal,
                item.CreatedAt,
                item.UpdatedAt
            )
        );
    }

    /// <summary>
    /// Add an item to an existing order (admin only)
    /// </summary>
    [HttpPost("order/{orderId:guid}")]
    public async Task<ActionResult<OrderItemResponse>> AddOrderItem(Guid orderId, [FromBody] AddOrderItemDto dto)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var order = await Context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Order not found" });
            }

            if (order.Status == OrderStatus.Cancelled || order.Status == OrderStatus.Delivered)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Cannot add items to a cancelled or delivered order" });
            }

            var variant = await Context
                .ProductVariants.Include(v => v.Product)
                .Include(v => v.Inventory)
                .FirstOrDefaultAsync(v => v.Id == dto.VariantId);

            if (variant == null)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Variant with ID {dto.VariantId} not found" });
            }

            // Check inventory
            if (variant.Inventory == null)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = $"No inventory record for variant {dto.VariantId}" });
            }

            if (variant.Inventory.Quantity < dto.Quantity)
            {
                await transaction.RollbackAsync();
                return Conflict(
                    new
                    {
                        message = $"Insufficient stock for '{variant.Product.Name}' ({variant.Size}/{variant.Color}). "
                            + $"Available: {variant.Inventory.Quantity}, Requested: {dto.Quantity}",
                    }
                );
            }

            // Deduct stock
            variant.Inventory.Quantity -= dto.Quantity;

            var subtotal = dto.UnitPrice * dto.Quantity;

            var item = new OrderItem
            {
                OrderId = orderId,
                VariantId = dto.VariantId,
                RequestId = dto.RequestId,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                Subtotal = subtotal,
            };

            Context.OrderItems.Add(item);

            // Update order total
            order.TotalAmount += subtotal;

            await Context.SaveChangesAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(
                nameof(GetOrderItem),
                new { id = item.Id },
                new OrderItemResponse(
                    item.Id,
                    item.OrderId,
                    item.VariantId,
                    item.RequestId,
                    variant.Product.Name,
                    variant.Size,
                    variant.Color,
                    item.Quantity,
                    item.UnitPrice,
                    item.Subtotal,
                    item.CreatedAt,
                    item.UpdatedAt
                )
            );
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Update an order item (admin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<OrderItemResponse>> UpdateOrderItem(Guid id, [FromBody] UpdateOrderItemDto dto)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var item = await Context
                .OrderItems.Include(i => i.Order)
                .Include(i => i.Variant)
                    .ThenInclude(v => v.Product)
                .Include(i => i.Variant)
                    .ThenInclude(v => v.Inventory)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Order item not found" });
            }

            if (item.Order.Status == OrderStatus.Cancelled || item.Order.Status == OrderStatus.Delivered)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Cannot update items in a cancelled or delivered order" });
            }

            var oldSubtotal = item.Subtotal;

            if (dto.Quantity.HasValue)
            {
                var quantityDiff = dto.Quantity.Value - item.Quantity;

                if (quantityDiff > 0 && item.Variant.Inventory != null)
                {
                    // Need more stock
                    if (item.Variant.Inventory.Quantity < quantityDiff)
                    {
                        await transaction.RollbackAsync();
                        return Conflict(
                            new
                            {
                                message = $"Insufficient stock. Available: {item.Variant.Inventory.Quantity}, "
                                    + $"Additional needed: {quantityDiff}",
                            }
                        );
                    }
                    item.Variant.Inventory.Quantity -= quantityDiff;
                }
                else if (quantityDiff < 0 && item.Variant.Inventory != null)
                {
                    // Return stock
                    item.Variant.Inventory.Quantity += Math.Abs(quantityDiff);
                }

                item.Quantity = dto.Quantity.Value;
            }

            if (dto.UnitPrice.HasValue)
                item.UnitPrice = dto.UnitPrice.Value;

            if (dto.RequestId.HasValue)
                item.RequestId = dto.RequestId.Value;

            // Recalculate subtotal
            item.Subtotal = item.UnitPrice * item.Quantity;

            // Update order total
            item.Order.TotalAmount = item.Order.TotalAmount - oldSubtotal + item.Subtotal;

            await Context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(
                new OrderItemResponse(
                    item.Id,
                    item.OrderId,
                    item.VariantId,
                    item.RequestId,
                    item.Variant.Product.Name,
                    item.Variant.Size,
                    item.Variant.Color,
                    item.Quantity,
                    item.UnitPrice,
                    item.Subtotal,
                    item.CreatedAt,
                    item.UpdatedAt
                )
            );
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Delete an order item (admin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteOrderItem(Guid id)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var item = await Context
                .OrderItems.Include(i => i.Order)
                .Include(i => i.Variant)
                    .ThenInclude(v => v.Inventory)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Order item not found" });
            }

            if (item.Order.Status == OrderStatus.Cancelled || item.Order.Status == OrderStatus.Delivered)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Cannot remove items from a cancelled or delivered order" });
            }

            // Restore inventory
            if (item.Variant.Inventory != null)
            {
                item.Variant.Inventory.Quantity += item.Quantity;
            }

            // Update order total
            item.Order.TotalAmount -= item.Subtotal;

            Context.OrderItems.Remove(item);
            await Context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
