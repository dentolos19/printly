using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("variants")]
[Authorize]
public class VariantController(DatabaseContext context, StorageService storageService) : BaseController(context)
{
    /// <summary>
    /// Gets all variants with inventory details.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantWithProductResponse>>> GetAllVariants(
        [FromQuery] Guid? productId = null,
        [FromQuery] ProductSize? size = null,
        [FromQuery] string? color = null
    )
    {
        var query = Context.ProductVariants
            .Include(v => v.Product)
            .Include(v => v.Inventory)
            .Include(v => v.Image)
            .AsQueryable();

        if (productId.HasValue)
            query = query.Where(v => v.ProductId == productId.Value);

        if (size.HasValue)
            query = query.Where(v => v.Size == size.Value);

        if (!string.IsNullOrWhiteSpace(color))
            query = query.Where(v => v.Color.ToLower() == color.ToLower());

        var variants = await query
            .OrderBy(v => v.Product.Name)
            .ThenBy(v => v.Size)
            .ThenBy(v => v.Color)
            .ToListAsync();

        var responses = new List<ProductVariantWithProductResponse>();
        foreach (var v in variants)
        {
            string? imageUrl = null;
            if (v.Image != null)
            {
                imageUrl = await storageService.DownloadFileAsync(v.Image);
            }

            responses.Add(new ProductVariantWithProductResponse(
                v.Id,
                v.ProductId,
                v.Product.Name,
                v.Size,
                v.Color,
                v.ImageId,
                imageUrl,
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
            ));
        }

        return Ok(responses);
    }

    /// <summary>
    /// Gets a specific variant by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductVariantWithProductResponse>> GetVariant(Guid id)
    {
        var variant = await Context
            .ProductVariants
            .Include(v => v.Product)
            .Include(v => v.Inventory)
            .Include(v => v.Image)
            .Where(v => v.Id == id)
            .FirstOrDefaultAsync();

        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        string? imageUrl = null;
        if (variant.Image != null)
        {
            imageUrl = await storageService.DownloadFileAsync(variant.Image);
        }

        var response = new ProductVariantWithProductResponse(
            variant.Id,
            variant.ProductId,
            variant.Product.Name,
            variant.Size,
            variant.Color,
            variant.ImageId,
            imageUrl,
            variant.CreatedAt,
            variant.UpdatedAt,
            variant.Inventory == null
                ? null
                : new InventoryResponse(
                    variant.Inventory.Id,
                    variant.Inventory.VariantId,
                    variant.Inventory.Quantity,
                    variant.Inventory.ReorderLevel,
                    variant.Inventory.CreatedAt,
                    variant.Inventory.UpdatedAt
                )
        );

        return Ok(response);
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
            v.ProductId == dto.ProductId && v.Size == dto.Size && v.Color.ToLower() == dto.Color.ToLower()
        );

        if (existingVariant is not null)
        {
            return Conflict(
                new
                {
                    message = $"A variant with Size {dto.Size} and Color '{dto.Color}' already exists for this product",
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
    /// Uploads an image for a variant.
    /// </summary>
    [HttpPost("{id:guid}/image")]
    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(10_000_000)] // 10 MB
    public async Task<ActionResult<ProductVariantWithProductResponse>> UploadVariantImage(
        Guid id,
        IFormFile file
    )
    {
        var variant = await Context.ProductVariants
            .Include(v => v.Image)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No image file provided" });

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
        {
            return BadRequest(new { message = "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." });
        }

        // Delete old image if exists
        if (variant.Image != null)
        {
            await storageService.DeleteFileAsync(variant.Image);
        }

        // Upload new image
        await using var stream = file.OpenReadStream();
        var asset = await storageService.UploadFileAsync(stream, file.FileName);

        // Associate the asset with the variant
        variant.ImageId = asset.Id;
        variant.UpdatedAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();

        return await GetVariant(id);
    }

    /// <summary>
    /// Removes the image from a variant.
    /// </summary>
    [HttpDelete("{id:guid}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductVariantWithProductResponse>> RemoveVariantImage(Guid id)
    {
        var variant = await Context.ProductVariants
            .Include(v => v.Image)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        if (variant.Image != null)
        {
            await storageService.DeleteFileAsync(variant.Image);
            variant.ImageId = null;
            variant.UpdatedAt = DateTime.UtcNow;
            await Context.SaveChangesAsync();
        }

        return await GetVariant(id);
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
        if (dto.Size.HasValue || !string.IsNullOrWhiteSpace(dto.Color))
        {
            var existingVariant = await Context.ProductVariants.FirstOrDefaultAsync(v =>
                v.Id != id && v.ProductId == variant.ProductId && v.Size == newSize && v.Color.ToLower() == newColor.ToLower()
            );

            if (existingVariant is not null)
            {
                return Conflict(
                    new
                    {
                        message = $"A variant with Size {newSize} and Color '{newColor}' already exists for this product",
                    }
                );
            }
        }

        if (dto.Size.HasValue)
            variant.Size = dto.Size.Value;

        if (!string.IsNullOrWhiteSpace(dto.Color))
            variant.Color = dto.Color;

        variant.UpdatedAt = DateTime.UtcNow;
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
        var variant = await Context.ProductVariants
            .Include(v => v.Image)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (variant is null)
            return NotFound(new { message = "Variant not found" });

        // Delete associated image if exists
        if (variant.Image != null)
        {
            await storageService.DeleteFileAsync(variant.Image);
        }

        Context.ProductVariants.Remove(variant);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Gets variants by size.
    /// </summary>
    [HttpGet("by-size/{size}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantWithProductResponse>>> GetVariantsBySize(ProductSize size)
    {
        return await GetAllVariants(size: size);
    }

    /// <summary>
    /// Gets variants by color.
    /// </summary>
    [HttpGet("by-color/{color}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantWithProductResponse>>> GetVariantsByColor(string color)
    {
        return await GetAllVariants(color: color);
    }
}
