using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers;

[Route("variants")]
[Authorize]
public class VariantController(DatabaseContext context) : BaseController(context)
{
    /// <summary>
    /// Gets all variants with inventory details.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantWithProductResponse>>> GetAllVariants(
        [FromQuery] Guid? productId = null,
        [FromQuery] ProductSize? size = null,
        [FromQuery] ProductColor? color = null
    )
    {
        var query = Context.ProductVariants.Include(v => v.Product).Include(v => v.Inventory).AsQueryable();

        if (productId.HasValue)
            query = query.Where(v => v.ProductId == productId.Value);

        if (size.HasValue)
            query = query.Where(v => v.Size == size.Value);

        if (color.HasValue)
            query = query.Where(v => v.Color == color.Value);

        var variants = await query
            .OrderBy(v => v.Product.Name)
            .ThenBy(v => v.Size)
            .ThenBy(v => v.Color)
            .Select(v => new ProductVariantWithProductResponse(
                v.Id,
                v.ProductId,
                v.Product.Name,
                v.Size,
                v.Color,
                v.CreatedAt,
                v.UpdatedAt,
                v.Inventory == null
                    ? null
                    : new InventoryResponse(
                        v.Inventory.Id,
                        v.Inventory.VariantId,
                        v.Inventory.Quantity,
                        v.Inventory.ReorderLevel,
                        v.Inventory.CreatedAt,
                        v.Inventory.UpdatedAt
                    )
            ))
            .ToListAsync();

        return Ok(variants);
    }

    /// <summary>
    /// Gets a specific variant by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductVariantWithProductResponse>> GetVariant(Guid id)
    {
        var variant = await Context
            .ProductVariants.Include(v => v.Product)
            .Include(v => v.Inventory)
            .Where(v => v.Id == id)
            .Select(v => new ProductVariantWithProductResponse(
                v.Id,
                v.ProductId,
                v.Product.Name,
                v.Size,
                v.Color,
                v.CreatedAt,
                v.UpdatedAt,
                v.Inventory == null
                    ? null
                    : new InventoryResponse(
                        v.Inventory.Id,
                        v.Inventory.VariantId,
                        v.Inventory.Quantity,
                        v.Inventory.ReorderLevel,
                        v.Inventory.CreatedAt,
                        v.Inventory.UpdatedAt
                    )
            ))
            .FirstOrDefaultAsync();

        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        return Ok(variant);
    }

    /// <summary>
    /// Creates a new variant for a product.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductVariantWithProductResponse>> CreateVariant(
        [FromBody] CreateProductVariantDto dto
    )
    {
        // Verify product exists
        var product = await Context.Products.FindAsync(dto.ProductId);
        if (product is null)
            return NotFound(new { message = "Product not found" });

        // Check for duplicate variant
        var existingVariant = await Context.ProductVariants.FirstOrDefaultAsync(v =>
            v.ProductId == dto.ProductId && v.Size == dto.Size && v.Color == dto.Color
        );

        if (existingVariant is not null)
        {
            return Conflict(
                new
                {
                    message = $"A variant with Size {dto.Size} and Color {dto.Color} already exists for this product",
                }
            );
        }

        var variant = new ProductVariant
        {
            ProductId = dto.ProductId,
            Size = dto.Size,
            Color = dto.Color,
            Inventory = new Inventory { Quantity = 0, ReorderLevel = 10 },
        };

        Context.ProductVariants.Add(variant);
        await Context.SaveChangesAsync();

        return await GetVariant(variant.Id);
    }

    /// <summary>
    /// Updates an existing variant.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductVariantWithProductResponse>> UpdateVariant(
        Guid id,
        [FromBody] UpdateProductVariantDto dto
    )
    {
        var variant = await Context.ProductVariants.FindAsync(id);

        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        var newSize = dto.Size ?? variant.Size;
        var newColor = dto.Color ?? variant.Color;

        // Check for duplicate if size or color is being changed
        if (dto.Size.HasValue || dto.Color.HasValue)
        {
            var existingVariant = await Context.ProductVariants.FirstOrDefaultAsync(v =>
                v.Id != id && v.ProductId == variant.ProductId && v.Size == newSize && v.Color == newColor
            );

            if (existingVariant is not null)
            {
                return Conflict(
                    new
                    {
                        message = $"A variant with Size {newSize} and Color {newColor} already exists for this product",
                    }
                );
            }
        }

        if (dto.Size.HasValue)
            variant.Size = dto.Size.Value;

        if (dto.Color.HasValue)
            variant.Color = dto.Color.Value;

        await Context.SaveChangesAsync();

        return await GetVariant(id);
    }

    /// <summary>
    /// Deletes a variant and its inventory.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteVariant(Guid id)
    {
        var variant = await Context.ProductVariants.FindAsync(id);

        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        Context.ProductVariants.Remove(variant);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Gets variants by size - May be redundant (use filter query params instead).
    /// </summary>
    [HttpGet("by-size/{size}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantWithProductResponse>>> GetVariantsBySize(ProductSize size)
    {
        return await GetAllVariants(size: size);
    }

    /// <summary>
    /// Gets variants by color - May be redundant (use filter query params instead).
    /// </summary>
    [HttpGet("by-color/{color}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantWithProductResponse>>> GetVariantsByColor(
        ProductColor color
    )
    {
        return await GetAllVariants(color: color);
    }
}
