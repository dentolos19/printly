using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("orders")]
[Authorize]
public class OrderController(DatabaseContext context, GenerativeService generativeService) : BaseController(context)
{
    /// <summary>
    /// Get order statistics for the current user
    /// </summary>
    [HttpGet("my/stats")]
    public async Task<ActionResult<UserOrderStatsResponse>> GetMyOrderStats()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var orders = await Context.Orders.Where(o => o.UserId == userId).Include(o => o.Items).ToListAsync();

        var activeStatuses = new[]
        {
            OrderStatus.PendingPayment,
            OrderStatus.Paid,
            OrderStatus.Processing,
            OrderStatus.Shipped,
        };
        var activeOrders = orders.Count(o => activeStatuses.Contains(o.Status));
        var pendingPayment = orders.Count(o => o.Status == OrderStatus.PendingPayment);
        var completedOrders = orders.Count(o => o.Status == OrderStatus.Delivered);
        var totalSpent = orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.TotalAmount);

        return Ok(new UserOrderStatsResponse(activeOrders, pendingPayment, completedOrders, totalSpent));
    }

    /// <summary>
    /// Get all orders for the current user
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<OrderSummaryResponse>>> GetMyOrders(
        [FromQuery] OrderStatus? status = null
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var query = Context.Orders.Where(o => o.UserId == userId);

        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        var orders = await query
            .Include(o => o.User)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new OrderSummaryResponse(
                o.Id,
                o.UserId,
                o.User.Email ?? "",
                o.Status,
                o.TotalAmount,
                o.Items.Count,
                o.CreatedAt,
                o.UpdatedAt
            ))
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>
    /// Get a specific order for the current user
    /// </summary>
    [HttpGet("my/{id:guid}")]
    public async Task<ActionResult<OrderResponse>> GetMyOrder(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var order = await Context
            .Orders.Include(o => o.User)
            .Include(o => o.Items)
                .ThenInclude(i => i.Variant)
                    .ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        return Ok(MapToOrderResponse(order));
    }

    /// <summary>
    /// Create a new order for the current user.
    /// This validates stock availability and deducts inventory atomically.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<OrderResponse>> CreateOrder([FromBody] CreateOrderDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new { message = "Order must have at least one item" });

        // Use a transaction to ensure atomicity
        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var orderItems = new List<OrderItem>();
            decimal totalAmount = 0;

            foreach (var item in dto.Items)
            {
                // Validate variant exists and get product info
                var variant = await Context
                    .ProductVariants.Include(v => v.Product)
                    .Include(v => v.Inventory)
                    .FirstOrDefaultAsync(v => v.Id == item.VariantId);

                if (variant == null)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = $"Variant with ID {item.VariantId} not found" });
                }

                if (!variant.Product.IsActive)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = $"Product '{variant.Product.Name}' is not available" });
                }

                if (item.Quantity <= 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = "Quantity must be at least 1" });
                }

                // Check inventory
                if (variant.Inventory == null)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new { message = $"No inventory record for variant {item.VariantId}" });
                }

                if (variant.Inventory.Quantity < item.Quantity)
                {
                    await transaction.RollbackAsync();
                    return Conflict(
                        new
                        {
                            message = $"Insufficient stock for '{variant.Product.Name}' ({variant.Size}/{variant.Color}). "
                                + $"Available: {variant.Inventory.Quantity}, Requested: {item.Quantity}",
                        }
                    );
                }

                // Calculate price (base price for now, design request price will be added later)
                // TODO: Add design request extra price when that table is implemented
                decimal unitPrice = variant.Product.BasePrice;
                decimal subtotal = unitPrice * item.Quantity;

                // Deduct stock
                variant.Inventory.Quantity -= item.Quantity;

                // Create order item
                var orderItem = new OrderItem
                {
                    VariantId = item.VariantId,
                    RequestId = item.RequestId,
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice,
                    Subtotal = subtotal,
                };

                orderItems.Add(orderItem);
                totalAmount += subtotal;
            }

            // Create order
            var order = new Order
            {
                UserId = userId,
                Status = OrderStatus.PendingPayment,
                TotalAmount = totalAmount,
                Items = orderItems,
            };

            Context.Orders.Add(order);
            await Context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Reload with full navigation properties
            var createdOrder = await Context
                .Orders.Include(o => o.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Product)
                .FirstAsync(o => o.Id == order.Id);

            return CreatedAtAction(nameof(GetMyOrder), new { id = order.Id }, MapToOrderResponse(createdOrder));
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Cancel an order (user can only cancel their own PendingPayment orders)
    /// </summary>
    [HttpPost("my/{id:guid}/cancel")]
    public async Task<ActionResult<OrderResponse>> CancelMyOrder(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var order = await Context
                .Orders.Include(o => o.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Inventory)
                .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

            if (order == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Order not found" });
            }

            if (order.Status != OrderStatus.PendingPayment)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Only pending payment orders can be cancelled by the user" });
            }

            // Restore inventory
            foreach (var item in order.Items)
            {
                if (item.Variant.Inventory != null)
                {
                    item.Variant.Inventory.Quantity += item.Quantity;
                }
            }

            order.Status = OrderStatus.Cancelled;
            await Context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Reload with product info
            var updatedOrder = await Context
                .Orders.Include(o => o.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Product)
                .FirstAsync(o => o.Id == id);

            return Ok(MapToOrderResponse(updatedOrder));
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Pay for an order (user can only pay for their own PendingPayment orders)
    /// </summary>
    [HttpPost("my/{id:guid}/pay")]
    public async Task<ActionResult<OrderResponse>> PayMyOrder(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var order = await Context
            .Orders.Include(o => o.User)
            .Include(o => o.Items)
                .ThenInclude(i => i.Variant)
                    .ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        if (order.Status != OrderStatus.PendingPayment)
            return BadRequest(new { message = "Only pending payment orders can be paid" });

        order.Status = OrderStatus.Paid;
        await Context.SaveChangesAsync();

        return Ok(MapToOrderResponse(order));
    }

    // ==================== Admin Endpoints ====================

    /// <summary>
    /// Get admin order statistics for dashboard
    /// </summary>
    [HttpGet("stats")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<AdminOrderStatsResponse>> GetAdminOrderStats()
    {
        var orders = await Context.Orders.ToListAsync();

        // Calculate stats
        var totalOrders = orders.Count;
        var totalRevenue = orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.TotalAmount);
        var pendingOrders = orders.Count(o => o.Status == OrderStatus.PendingPayment);
        var processingOrders = orders.Count(o => o.Status == OrderStatus.Paid || o.Status == OrderStatus.Processing);
        var shippedOrders = orders.Count(o => o.Status == OrderStatus.Shipped);
        var completedOrders = orders.Count(o => o.Status == OrderStatus.Delivered);
        var cancelledOrders = orders.Count(o => o.Status == OrderStatus.Cancelled);

        // Calculate monthly revenue for the last 6 months
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-5).Date;
        var monthlyRevenue = orders
            .Where(o => o.Status != OrderStatus.Cancelled && o.CreatedAt >= sixMonthsAgo)
            .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
            .Select(g => new MonthlyRevenueData($"{g.Key.Year}-{g.Key.Month:D2}", g.Sum(o => o.TotalAmount), g.Count()))
            .OrderBy(m => m.Month)
            .ToList();

        // Fill in missing months with zero values
        var allMonths = new List<MonthlyRevenueData>();
        for (var i = 0; i < 6; i++)
        {
            var date = DateTime.UtcNow.AddMonths(-5 + i);
            var monthKey = $"{date.Year}-{date.Month:D2}";
            var existing = monthlyRevenue.FirstOrDefault(m => m.Month == monthKey);
            allMonths.Add(existing ?? new MonthlyRevenueData(monthKey, 0, 0));
        }

        // Order status distribution
        var statusDistribution = new List<OrderStatusData>
        {
            new("Pending Payment", pendingOrders),
            new("Processing", processingOrders),
            new("Shipped", shippedOrders),
            new("Delivered", completedOrders),
            new("Cancelled", cancelledOrders),
        };

        return Ok(
            new AdminOrderStatsResponse(
                totalOrders,
                totalRevenue,
                pendingOrders,
                processingOrders,
                shippedOrders,
                completedOrders,
                cancelledOrders,
                allMonths,
                statusDistribution
            )
        );
    }

    /// <summary>
    /// Get AI-generated sales analysis for the business
    /// </summary>
    [HttpGet("analysis")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<AiSalesAnalysisResponse>> GetAiSalesAnalysis()
    {
        // Gather comprehensive data for analysis
        var orders = await Context
            .Orders.Include(o => o.Items)
                .ThenInclude(i => i.Variant)
                    .ThenInclude(v => v.Product)
            .ToListAsync();

        var products = await Context.Products.Include(p => p.Variants).ThenInclude(v => v.Inventory).ToListAsync();

        // Calculate key metrics
        var totalOrders = orders.Count;
        var completedOrders = orders.Count(o => o.Status == OrderStatus.Delivered);
        var cancelledOrders = orders.Count(o => o.Status == OrderStatus.Cancelled);
        var pendingOrders = orders.Count(o =>
            o.Status == OrderStatus.PendingPayment || o.Status == OrderStatus.Paid || o.Status == OrderStatus.Processing
        );
        var totalRevenue = orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.TotalAmount);
        var averageOrderValue =
            completedOrders > 0 ? orders.Where(o => o.Status == OrderStatus.Delivered).Average(o => o.TotalAmount) : 0;

        // Monthly breakdown (last 6 months)
        var monthlyData = new List<string>();
        for (var i = 5; i >= 0; i--)
        {
            var date = DateTime.UtcNow.AddMonths(-i);
            var monthOrders = orders.Where(o =>
                o.CreatedAt.Year == date.Year && o.CreatedAt.Month == date.Month && o.Status != OrderStatus.Cancelled
            );
            var monthRevenue = monthOrders.Sum(o => o.TotalAmount);
            var monthCount = monthOrders.Count();
            monthlyData.Add($"- {date:MMMM yyyy}: {monthCount} orders, ${monthRevenue:F2} revenue");
        }

        // Product performance
        var productSales = orders
            .Where(o => o.Status != OrderStatus.Cancelled)
            .SelectMany(o => o.Items)
            .GroupBy(i => i.Variant.Product.Name)
            .Select(g => new
            {
                Product = g.Key,
                TotalQuantity = g.Sum(i => i.Quantity),
                Revenue = g.Sum(i => i.Subtotal),
            })
            .OrderByDescending(p => p.Revenue)
            .Take(10)
            .ToList();

        var productPerformance = string.Join(
            "\n",
            productSales.Select(p => $"- {p.Product}: {p.TotalQuantity} units sold, ${p.Revenue:F2} revenue")
        );

        // Inventory status
        var lowStockProducts = products
            .SelectMany(p => p.Variants)
            .Where(v => v.Inventory != null && v.Inventory.Quantity <= v.Inventory.ReorderLevel)
            .Select(v => $"- {v.Product.Name} ({v.Size}/{v.Color}): {v.Inventory!.Quantity} left")
            .Take(10)
            .ToList();

        var outOfStockCount = products.SelectMany(p => p.Variants).Count(v => v.Inventory?.Quantity == 0);
        var totalProducts = products.Count;
        var activeProducts = products.Count(p => p.IsActive);

        // Order status breakdown
        var statusBreakdown =
            $@"
- Pending Payment: {orders.Count(o => o.Status == OrderStatus.PendingPayment)}
- Paid (awaiting processing): {orders.Count(o => o.Status == OrderStatus.Paid)}
- Processing: {orders.Count(o => o.Status == OrderStatus.Processing)}
- Shipped: {orders.Count(o => o.Status == OrderStatus.Shipped)}
- Delivered: {completedOrders}
- Cancelled: {cancelledOrders}";

        // Calculate cancellation rate
        var cancellationRate = totalOrders > 0 ? (decimal)cancelledOrders / totalOrders * 100 : 0;
        var completionRate = totalOrders > 0 ? (decimal)completedOrders / totalOrders * 100 : 0;

        // Build comprehensive prompt
        var prompt =
            $@"You are a business analyst for Printly, an e-commerce company selling customizable printed products (t-shirts, hoodies, etc.). 

Analyze the following business data and provide actionable insights:

## SALES OVERVIEW
- Total Orders: {totalOrders}
- Completed Orders: {completedOrders}
- Cancelled Orders: {cancelledOrders}
- Pending/In-Progress Orders: {pendingOrders}
- Total Revenue: ${totalRevenue:F2}
- Average Order Value: ${averageOrderValue:F2}
- Completion Rate: {completionRate:F1}%
- Cancellation Rate: {cancellationRate:F1}%

## MONTHLY PERFORMANCE (Last 6 Months)
{string.Join("\n", monthlyData)}

## TOP SELLING PRODUCTS
{(productPerformance.Length > 0 ? productPerformance : "No sales data available")}

## INVENTORY STATUS
- Total Products: {totalProducts}
- Active Products: {activeProducts}
- Out of Stock Variants: {outOfStockCount}
- Low Stock Items:
{(lowStockProducts.Count > 0 ? string.Join("\n", lowStockProducts) : "No low stock items")}

## ORDER STATUS BREAKDOWN
{statusBreakdown}

Please provide:
1. **Executive Summary**: A brief overview of business health
2. **Key Strengths**: What the business is doing well
3. **Areas for Improvement**: Specific issues that need attention
4. **Actionable Recommendations**: Concrete steps to improve sales and operations
5. **Inventory Recommendations**: Suggestions for stock management
6. **Growth Opportunities**: Potential areas for expansion or improvement

Keep the analysis professional, data-driven, and actionable. Format with clear headers and bullet points. Make sure the analysis is short and concise and add extra a newline between paragraphs";

        var analysis = await generativeService.GenerateTextAsync(prompt);

        return Ok(new AiSalesAnalysisResponse(analysis, DateTime.UtcNow));
    }

    /// <summary>
    /// Get all orders (admin only)
    /// </summary>
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<OrderSummaryResponse>>> GetAllOrders(
        [FromQuery] OrderStatus? status = null,
        [FromQuery] string? userId = null
    )
    {
        var query = Context.Orders.AsQueryable();

        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        if (!string.IsNullOrEmpty(userId))
            query = query.Where(o => o.UserId == userId);

        var orders = await query
            .Include(o => o.User)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new OrderSummaryResponse(
                o.Id,
                o.UserId,
                o.User.Email ?? "",
                o.Status,
                o.TotalAmount,
                o.Items.Count,
                o.CreatedAt,
                o.UpdatedAt
            ))
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>
    /// Get a specific order by ID (admin only)
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<OrderResponse>> GetOrder(Guid id)
    {
        var order = await Context
            .Orders.Include(o => o.User)
            .Include(o => o.Items)
                .ThenInclude(i => i.Variant)
                    .ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        return Ok(MapToOrderResponse(order));
    }

    /// <summary>
    /// Update order status (admin only)
    /// Valid transitions: PendingPayment → Paid → Processing → Shipped → Delivered
    /// Cancelled is terminal.
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<OrderResponse>> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusDto dto)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var order = await Context
                .Orders.Include(o => o.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Inventory)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Order not found" });
            }

            // Validate status transition
            var validationResult = ValidateStatusTransition(order.Status, dto.Status);
            if (validationResult != null)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = validationResult });
            }

            // If cancelling, restore inventory
            if (dto.Status == OrderStatus.Cancelled && order.Status != OrderStatus.Cancelled)
            {
                foreach (var item in order.Items)
                {
                    if (item.Variant.Inventory != null)
                    {
                        item.Variant.Inventory.Quantity += item.Quantity;
                    }
                }
            }

            order.Status = dto.Status;
            await Context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Reload with product info
            var updatedOrder = await Context
                .Orders.Include(o => o.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Product)
                .FirstAsync(o => o.Id == id);

            return Ok(MapToOrderResponse(updatedOrder));
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Update order details (admin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<OrderResponse>> UpdateOrder(Guid id, [FromBody] AdminUpdateOrderDto dto)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var order = await Context
                .Orders.Include(o => o.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Inventory)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Order not found" });
            }

            if (order.Status == OrderStatus.Cancelled)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Cannot update a cancelled order" });
            }

            if (dto.Status.HasValue)
            {
                var validationResult = ValidateStatusTransition(order.Status, dto.Status.Value);
                if (validationResult != null)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = validationResult });
                }

                // If cancelling, restore inventory
                if (dto.Status.Value == OrderStatus.Cancelled)
                {
                    foreach (var item in order.Items)
                    {
                        if (item.Variant.Inventory != null)
                        {
                            item.Variant.Inventory.Quantity += item.Quantity;
                        }
                    }
                }

                order.Status = dto.Status.Value;
            }

            if (dto.TotalAmount.HasValue)
                order.TotalAmount = dto.TotalAmount.Value;

            await Context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Reload with product info
            var updatedOrder = await Context
                .Orders.Include(o => o.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Product)
                .FirstAsync(o => o.Id == id);

            return Ok(MapToOrderResponse(updatedOrder));
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Delete an order (admin only, soft delete by setting status to Cancelled)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> DeleteOrder(Guid id)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync();

        try
        {
            var order = await Context
                .Orders.Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v.Inventory)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Order not found" });
            }

            // Restore inventory if not already cancelled
            if (order.Status != OrderStatus.Cancelled)
            {
                foreach (var item in order.Items)
                {
                    if (item.Variant.Inventory != null)
                    {
                        item.Variant.Inventory.Quantity += item.Quantity;
                    }
                }
            }

            // Hard delete the order and its items
            Context.Orders.Remove(order);
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

    // ==================== Helper Methods ====================

    private static string? ValidateStatusTransition(OrderStatus currentStatus, OrderStatus newStatus)
    {
        // Cancelled is terminal - cannot transition from cancelled
        if (currentStatus == OrderStatus.Cancelled)
            return "Cannot change status of a cancelled order";

        // Delivered is terminal - cannot transition from delivered
        if (currentStatus == OrderStatus.Delivered)
            return "Cannot change status of a delivered order";

        // Allow cancellation from any non-terminal state
        if (newStatus == OrderStatus.Cancelled)
            return null;

        // Define valid forward transitions
        var validTransitions = new Dictionary<OrderStatus, OrderStatus[]>
        {
            { OrderStatus.PendingPayment, [OrderStatus.Paid, OrderStatus.Cancelled] },
            { OrderStatus.Paid, [OrderStatus.Processing, OrderStatus.Shipped, OrderStatus.Cancelled] },
            { OrderStatus.Processing, [OrderStatus.Shipped, OrderStatus.Cancelled] },
            { OrderStatus.Shipped, [OrderStatus.Delivered, OrderStatus.Cancelled] },
        };

        if (validTransitions.TryGetValue(currentStatus, out var allowed) && allowed.Contains(newStatus))
            return null;

        return $"Invalid status transition from {currentStatus} to {newStatus}";
    }

    private static OrderResponse MapToOrderResponse(Order order)
    {
        return new OrderResponse(
            order.Id,
            order.UserId,
            order.User.Email ?? "",
            order.Status,
            order.TotalAmount,
            order.CreatedAt,
            order.UpdatedAt,
            order
                .Items.Select(i => new OrderItemResponse(
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
                .ToList()
        );
    }
}
