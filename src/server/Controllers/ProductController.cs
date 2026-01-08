using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers;

[Route("products")]
[Authorize]
public class ProductController(DatabaseContext context) : BaseController(context)
{
    /// <summary>
    /// Gets all products with full details (variants and inventory).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductResponse>>> GetAllProducts([FromQuery] bool? isActive = null)
    {
        var query = Context.Products.AsQueryable();

        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        var products = await query
            .Include(p => p.Variants)
                .ThenInclude(v => v.Inventory)
            .OrderBy(p => p.Name)
            .Select(p => new ProductResponse(
                p.Id,
                p.Name,
                p.BasePrice,
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt,
                p.Variants.Select(v => new ProductVariantResponse(
                        v.Id,
                        v.ProductId,
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
                    .ToList()
            ))
            .ToListAsync();

        return Ok(products);
    }

    /// <summary>
    /// Gets product summaries (without full variant details) - May be redundant.
    /// </summary>
    [HttpGet("summary")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductSummaryResponse>>> GetProductSummaries(
        [FromQuery] bool? isActive = null
    )
    {
        var query = Context.Products.AsQueryable();

        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        var products = await query
            .Include(p => p.Variants)
                .ThenInclude(v => v.Inventory)
            .OrderBy(p => p.Name)
            .Select(p => new ProductSummaryResponse(
                p.Id,
                p.Name,
                p.BasePrice,
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt,
                p.Variants.Count,
                p.Variants.Sum(v => v.Inventory != null ? v.Inventory.Quantity : 0)
            ))
            .ToListAsync();

        return Ok(products);
    }

    /// <summary>
    /// Gets a specific product by ID with full details.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductResponse>> GetProduct(Guid id)
    {
        var product = await Context
            .Products.Include(p => p.Variants)
                .ThenInclude(v => v.Inventory)
            .Where(p => p.Id == id)
            .Select(p => new ProductResponse(
                p.Id,
                p.Name,
                p.BasePrice,
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt,
                p.Variants.Select(v => new ProductVariantResponse(
                        v.Id,
                        v.ProductId,
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
                    .ToList()
            ))
            .FirstOrDefaultAsync();

        if (product is null)
            return NotFound(new { message = "Product not found" });

        return Ok(product);
    }

    /// <summary>
    /// Creates a new product.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> CreateProduct([FromBody] CreateProductDto dto)
    {
        var product = new Product
        {
            Name = dto.Name,
            BasePrice = dto.BasePrice,
            IsActive = dto.IsActive,
        };

        Context.Products.Add(product);
        await Context.SaveChangesAsync();

        var response = new ProductResponse(
            product.Id,
            product.Name,
            product.BasePrice,
            product.IsActive,
            product.CreatedAt,
            product.UpdatedAt,
            new List<ProductVariantResponse>()
        );

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, response);
    }

    /// <summary>
    /// Creates a product with variants in one request - May be redundant.
    /// </summary>
    [HttpPost("with-variants")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> CreateProductWithVariants(
        [FromBody] CreateProductWithVariantsDto dto
    )
    {
        var product = new Product
        {
            Name = dto.Name,
            BasePrice = dto.BasePrice,
            IsActive = dto.IsActive,
        };

        Context.Products.Add(product);

        var variants = new List<ProductVariant>();
        var inventories = new List<Inventory>();

        if (dto.Variants != null)
        {
            foreach (var variantDto in dto.Variants)
            {
                // Check for duplicate variant
                var duplicate = variants.Any(v => v.Size == variantDto.Size && v.Color == variantDto.Color);
                if (duplicate)
                {
                    return BadRequest(
                        new { message = $"Duplicate variant: Size {variantDto.Size}, Color {variantDto.Color}" }
                    );
                }

                var variant = new ProductVariant
                {
                    ProductId = product.Id,
                    Size = variantDto.Size,
                    Color = variantDto.Color,
                };
                variants.Add(variant);

                var inventory = new Inventory
                {
                    VariantId = variant.Id,
                    Quantity = variantDto.InitialQuantity,
                    ReorderLevel = variantDto.ReorderLevel,
                };
                inventories.Add(inventory);
            }
        }

        Context.ProductVariants.AddRange(variants);
        Context.Inventories.AddRange(inventories);
        await Context.SaveChangesAsync();

        // Reload with full data
        return await GetProduct(product.Id);
    }

    /// <summary>
    /// Updates an existing product.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> UpdateProduct(Guid id, [FromBody] UpdateProductDto dto)
    {
        var product = await Context.Products.FindAsync(id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        if (dto.Name is not null)
            product.Name = dto.Name;

        if (dto.BasePrice.HasValue)
            product.BasePrice = dto.BasePrice.Value;

        if (dto.IsActive.HasValue)
            product.IsActive = dto.IsActive.Value;

        await Context.SaveChangesAsync();

        return await GetProduct(id);
    }

    /// <summary>
    /// Deletes a product and all its variants and inventory.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteProduct(Guid id)
    {
        var product = await Context.Products.FindAsync(id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        Context.Products.Remove(product);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Soft deletes a product by setting IsActive to false - May be redundant.
    /// </summary>
    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> DeactivateProduct(Guid id)
    {
        var product = await Context.Products.FindAsync(id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        product.IsActive = false;
        await Context.SaveChangesAsync();

        return await GetProduct(id);
    }

    /// <summary>
    /// Reactivates a soft-deleted product - May be redundant.
    /// </summary>
    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> ActivateProduct(Guid id)
    {
        var product = await Context.Products.FindAsync(id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        product.IsActive = true;
        await Context.SaveChangesAsync();

        return await GetProduct(id);
    }

    /// <summary>
    /// Gets all variants for a specific product - May be redundant.
    /// </summary>
    [HttpGet("{id:guid}/variants")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantResponse>>> GetProductVariants(Guid id)
    {
        var product = await Context.Products.FindAsync(id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        var variants = await Context
            .ProductVariants.Include(v => v.Inventory)
            .Where(v => v.ProductId == id)
            .Select(v => new ProductVariantResponse(
                v.Id,
                v.ProductId,
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
}
