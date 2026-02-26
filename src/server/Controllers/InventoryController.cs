using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers;

[Route("inventory")]
[Authorize]
public class InventoryController(DatabaseContext context) : BaseController(context)
{
    /// <summary>
    /// Gets all inventory records.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<InventoryWithVariantResponse>>> GetAllInventory()
    {
        var inventory = await Context
            .Inventories.Include(i => i.Variant)
            .ThenInclude(v => v.Product)
            .OrderBy(i => i.Variant.Product.Name)
            .ThenBy(i => i.Variant.Size)
            .ThenBy(i => i.Variant.Color)
            .Select(i => new InventoryWithVariantResponse(
                i.Id,
                i.VariantId,
                i.Variant.ProductId,
                i.Variant.Product.Name,
                i.Variant.Size,
                i.Variant.Color,
                i.Quantity,
                i.ReorderLevel,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .ToListAsync();

        return Ok(inventory);
    }

    /// <summary>
    /// Gets inventory for a specific variant.
    /// </summary>
    [HttpGet("variant/{variantId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<InventoryWithVariantResponse>> GetInventoryByVariant(Guid variantId)
    {
        var inventory = await Context
            .Inventories.Include(i => i.Variant)
            .ThenInclude(v => v.Product)
            .Where(i => i.VariantId == variantId)
            .Select(i => new InventoryWithVariantResponse(
                i.Id,
                i.VariantId,
                i.Variant.ProductId,
                i.Variant.Product.Name,
                i.Variant.Size,
                i.Variant.Color,
                i.Quantity,
                i.ReorderLevel,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .FirstOrDefaultAsync();

        if (inventory is null)
            return NotFound(new { message = "Inventory not found for this variant" });

        return Ok(inventory);
    }

    /// <summary>
    /// Gets inventory for all variants of a product.
    /// </summary>
    [HttpGet("product/{productId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<InventoryWithVariantResponse>>> GetInventoryByProduct(Guid productId)
    {
        // Verify product exists
        var product = await Context.Products.FindAsync(productId);
        if (product is null)
            return NotFound(new { message = "Product not found" });

        var inventory = await Context
            .Inventories.Include(i => i.Variant)
            .ThenInclude(v => v.Product)
            .Where(i => i.Variant.ProductId == productId)
            .OrderBy(i => i.Variant.Size)
            .ThenBy(i => i.Variant.Color)
            .Select(i => new InventoryWithVariantResponse(
                i.Id,
                i.VariantId,
                i.Variant.ProductId,
                i.Variant.Product.Name,
                i.Variant.Size,
                i.Variant.Color,
                i.Quantity,
                i.ReorderLevel,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .ToListAsync();

        return Ok(inventory);
    }

    /// <summary>
    /// Gets a specific inventory record by ID - May be redundant.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<InventoryWithVariantResponse>> GetInventory(Guid id)
    {
        var inventory = await Context
            .Inventories.Include(i => i.Variant)
            .ThenInclude(v => v.Product)
            .Where(i => i.Id == id)
            .Select(i => new InventoryWithVariantResponse(
                i.Id,
                i.VariantId,
                i.Variant.ProductId,
                i.Variant.Product.Name,
                i.Variant.Size,
                i.Variant.Color,
                i.Quantity,
                i.ReorderLevel,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .FirstOrDefaultAsync();

        if (inventory is null)
            return NotFound(new { message = "Inventory not found" });

        return Ok(inventory);
    }

    /// <summary>
    /// Creates inventory for a variant.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InventoryWithVariantResponse>> CreateInventory([FromBody] CreateInventoryDto dto)
    {
        // Verify variant exists
        var variant = await Context.ProductVariants.FindAsync(dto.VariantId);
        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        // Check if inventory already exists for this variant
        var existingInventory = await Context.Inventories.FirstOrDefaultAsync(i => i.VariantId == dto.VariantId);
        if (existingInventory is not null)
        {
            return Conflict(new { message = "Inventory already exists for this variant. Use PUT to update." });
        }

        var inventory = new Inventory
        {
            VariantId = dto.VariantId,
            Quantity = dto.Quantity,
            ReorderLevel = dto.ReorderLevel,
        };

        Context.Inventories.Add(inventory);
        await Context.SaveChangesAsync();

        return await GetInventory(inventory.Id);
    }

    /// <summary>
    /// Updates inventory for a variant.
    /// </summary>
    [HttpPut("variant/{variantId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InventoryWithVariantResponse>> UpdateInventoryByVariant(
        Guid variantId,
        [FromBody] UpdateInventoryDto dto
    )
    {
        var inventory = await Context.Inventories.FirstOrDefaultAsync(i => i.VariantId == variantId);

        if (inventory is null)
            return NotFound(new { message = "Inventory not found for this variant" });

        if (dto.Quantity.HasValue)
            inventory.Quantity = dto.Quantity.Value;

        if (dto.ReorderLevel.HasValue)
            inventory.ReorderLevel = dto.ReorderLevel.Value;

        await Context.SaveChangesAsync();

        return await GetInventory(inventory.Id);
    }

    /// <summary>
    /// Updates inventory by inventory ID - May be redundant.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InventoryWithVariantResponse>> UpdateInventory(
        Guid id,
        [FromBody] UpdateInventoryDto dto
    )
    {
        var inventory = await Context.Inventories.FindAsync(id);

        if (inventory is null)
            return NotFound(new { message = "Inventory not found" });

        if (dto.Quantity.HasValue)
            inventory.Quantity = dto.Quantity.Value;

        if (dto.ReorderLevel.HasValue)
            inventory.ReorderLevel = dto.ReorderLevel.Value;

        await Context.SaveChangesAsync();

        return await GetInventory(id);
    }

    /// <summary>
    /// Deletes inventory for a variant - May be redundant (inventory is cascaded with variant).
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteInventory(Guid id)
    {
        var inventory = await Context.Inventories.FindAsync(id);

        if (inventory is null)
            return NotFound(new { message = "Inventory not found" });

        Context.Inventories.Remove(inventory);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Adjusts inventory quantity (add or subtract).
    /// Useful for stock adjustments without knowing the current quantity.
    /// </summary>
    [HttpPost("variant/{variantId:guid}/adjust")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InventoryWithVariantResponse>> AdjustInventory(
        Guid variantId,
        [FromBody] AdjustInventoryDto dto
    )
    {
        var inventory = await Context.Inventories.FirstOrDefaultAsync(i => i.VariantId == variantId);

        if (inventory is null)
            return NotFound(new { message = "Inventory not found for this variant" });

        var newQuantity = inventory.Quantity + dto.Adjustment;

        if (newQuantity < 0)
            return BadRequest(new { message = "Adjustment would result in negative inventory" });

        inventory.Quantity = newQuantity;
        await Context.SaveChangesAsync();

        return await GetInventory(inventory.Id);
    }

    /// <summary>
    /// Gets all inventory items that are at or below reorder level.
    /// </summary>
    [HttpGet("low-stock")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<LowStockAlertResponse>>> GetLowStockItems()
    {
        var lowStockItems = await Context
            .Inventories.Include(i => i.Variant)
            .ThenInclude(v => v.Product)
            .Where(i => i.Quantity <= i.ReorderLevel)
            .OrderBy(i => i.Quantity)
            .Select(i => new LowStockAlertResponse(
                i.Id,
                i.VariantId,
                i.Variant.ProductId,
                i.Variant.Product.Name,
                i.Variant.Size,
                i.Variant.Color,
                i.Quantity,
                i.ReorderLevel
            ))
            .ToListAsync();

        return Ok(lowStockItems);
    }

    /// <summary>
    /// Gets out of stock items (quantity = 0) - May be redundant (can filter low-stock).
    /// </summary>
    [HttpGet("out-of-stock")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<LowStockAlertResponse>>> GetOutOfStockItems()
    {
        var outOfStockItems = await Context
            .Inventories.Include(i => i.Variant)
            .ThenInclude(v => v.Product)
            .Where(i => i.Quantity == 0)
            .OrderBy(i => i.Variant.Product.Name)
            .Select(i => new LowStockAlertResponse(
                i.Id,
                i.VariantId,
                i.Variant.ProductId,
                i.Variant.Product.Name,
                i.Variant.Size,
                i.Variant.Color,
                i.Quantity,
                i.ReorderLevel
            ))
            .ToListAsync();

        return Ok(outOfStockItems);
    }

    /// <summary>
    /// Gets total stock count across all products - May be redundant.
    /// </summary>
    [HttpGet("total")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> GetTotalStock()
    {
        var totalStock = await Context.Inventories.SumAsync(i => i.Quantity);
        var totalVariants = await Context.Inventories.CountAsync();
        var lowStockCount = await Context.Inventories.CountAsync(i => i.Quantity <= i.ReorderLevel);
        var outOfStockCount = await Context.Inventories.CountAsync(i => i.Quantity == 0);

        return Ok(
            new
            {
                totalStock,
                totalVariants,
                lowStockCount,
                outOfStockCount,
            }
        );
    }
}

/// <summary>
/// DTO for adjusting inventory quantity
/// </summary>
public record AdjustInventoryDto(int Adjustment);
