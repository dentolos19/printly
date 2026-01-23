using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("products")]
[Authorize]
public class ProductController(DatabaseContext context, StorageService storageService) : BaseController(context)
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
            .Include(p => p.Image)
            .Include(p => p.Model)
            .Include(p => p.Variants)
                .ThenInclude(v => v.Inventory)
            .Include(p => p.Variants)
                .ThenInclude(v => v.Image)
            .OrderBy(p => p.Name)
            .ToListAsync();

        var responses = new List<ProductResponse>();
        foreach (var p in products)
        {
            string? productImageUrl = null;
            if (p.Image != null)
            {
                productImageUrl = await storageService.DownloadFileAsync(p.Image);
            }

            string? productModelUrl = null;
            if (p.Model != null)
            {
                productModelUrl = await storageService.DownloadFileAsync(p.Model);
            }

            var variantResponses = new List<ProductVariantResponse>();
            foreach (var v in p.Variants)
            {
                string? imageUrl = null;
                if (v.Image != null)
                {
                    imageUrl = await storageService.DownloadFileAsync(v.Image);
                }
                variantResponses.Add(
                    new ProductVariantResponse(
                        v.Id,
                        v.ProductId,
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
                    )
                );
            }

            responses.Add(
                new ProductResponse(
                    p.Id,
                    p.Name,
                    p.BasePrice,
                    p.IsActive,
                    p.ImageId,
                    productImageUrl,
                    p.ModelId,
                    productModelUrl,
                    p.CreatedAt,
                    p.UpdatedAt,
                    variantResponses
                )
            );
        }

        return Ok(responses);
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
            .Include(p => p.Image)
            .Include(p => p.Model)
            .Include(p => p.Variants)
                .ThenInclude(v => v.Inventory)
            .OrderBy(p => p.Name)
            .ToListAsync();

        var responses = new List<ProductSummaryResponse>();
        foreach (var p in products)
        {
            string? imageUrl = null;
            if (p.Image != null)
            {
                imageUrl = await storageService.DownloadFileAsync(p.Image);
            }

            string? modelUrl = null;
            if (p.Model != null)
            {
                modelUrl = await storageService.DownloadFileAsync(p.Model);
            }

            responses.Add(
                new ProductSummaryResponse(
                    p.Id,
                    p.Name,
                    p.BasePrice,
                    p.IsActive,
                    p.ImageId,
                    imageUrl,
                    p.ModelId,
                    modelUrl,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.Variants.Count,
                    p.Variants.Sum(v => v.Inventory != null ? v.Inventory.Quantity : 0)
                )
            );
        }

        return Ok(responses);
    }

    /// <summary>
    /// Gets a specific product by ID with full details.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductResponse>> GetProduct(Guid id)
    {
        var product = await Context
            .Products.Include(p => p.Image)
            .Include(p => p.Model)
            .Include(p => p.Variants)
                .ThenInclude(v => v.Inventory)
            .Include(p => p.Variants)
                .ThenInclude(v => v.Image)
            .Where(p => p.Id == id)
            .FirstOrDefaultAsync();

        if (product is null)
            return NotFound(new { message = "Product not found" });

        string? productImageUrl = null;
        if (product.Image != null)
        {
            productImageUrl = await storageService.DownloadFileAsync(product.Image);
        }

        string? productModelUrl = null;
        if (product.Model != null)
        {
            productModelUrl = await storageService.DownloadFileAsync(product.Model);
        }

        var variantResponses = new List<ProductVariantResponse>();
        foreach (var v in product.Variants)
        {
            string? imageUrl = null;
            if (v.Image != null)
            {
                imageUrl = await storageService.DownloadFileAsync(v.Image);
            }
            variantResponses.Add(
                new ProductVariantResponse(
                    v.Id,
                    v.ProductId,
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
                )
            );
        }

        var response = new ProductResponse(
            product.Id,
            product.Name,
            product.BasePrice,
            product.IsActive,
            product.ImageId,
            productImageUrl,
            product.ModelId,
            productModelUrl,
            product.CreatedAt,
            product.UpdatedAt,
            variantResponses
        );

        return Ok(response);
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
            null,
            null,
            null,
            null,
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
            .Include(v => v.Image)
            .Where(v => v.ProductId == id)
            .ToListAsync();

        var responses = new List<ProductVariantResponse>();
        foreach (var v in variants)
        {
            string? imageUrl = null;
            if (v.Image != null)
            {
                imageUrl = await storageService.DownloadFileAsync(v.Image);
            }
            responses.Add(
                new ProductVariantResponse(
                    v.Id,
                    v.ProductId,
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
                )
            );
        }

        return Ok(responses);
    }

    /// <summary>
    /// Uploads or updates a product image.
    /// </summary>
    [HttpPost("{id:guid}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> UploadProductImage(Guid id, [FromForm] IFormFile file)
    {
        var product = await Context.Products.Include(p => p.Image).FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        // Validate file type (images only)
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
        {
            return BadRequest(new { message = "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." });
        }

        // Delete old image if exists
        if (product.Image != null)
        {
            await storageService.DeleteFileAsync(product.Image);
            Context.Assets.Remove(product.Image);
        }

        // Upload new image (StorageService already saves the asset to database)
        using var stream = file.OpenReadStream();
        var asset = await storageService.UploadFileAsync(stream, file.FileName);
        product.ImageId = asset.Id;

        await Context.SaveChangesAsync();

        return await GetProduct(id);
    }

    /// <summary>
    /// Deletes a product image.
    /// </summary>
    [HttpDelete("{id:guid}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> DeleteProductImage(Guid id)
    {
        var product = await Context.Products.Include(p => p.Image).FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        if (product.Image == null)
            return BadRequest(new { message = "Product has no image" });

        await storageService.DeleteFileAsync(product.Image);
        Context.Assets.Remove(product.Image);
        product.ImageId = null;

        await Context.SaveChangesAsync();

        return await GetProduct(id);
    }

    /// <summary>
    /// Uploads or updates a product 3D model (.glb file).
    /// </summary>
    [HttpPost("{id:guid}/model")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> UploadProductModel(Guid id, [FromForm] IFormFile file)
    {
        var product = await Context.Products.Include(p => p.Model).FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        // Validate file type (.glb only)
        var fileName = file.FileName.ToLower();
        if (!fileName.EndsWith(".glb") && file.ContentType != "model/gltf-binary")
        {
            return BadRequest(new { message = "Invalid file type. Only .glb files are allowed." });
        }

        // Delete old model if exists
        if (product.Model != null)
        {
            await storageService.DeleteFileAsync(product.Model);
            Context.Assets.Remove(product.Model);
        }

        // Upload new model (StorageService already saves the asset to database)
        using var stream = file.OpenReadStream();
        var asset = await storageService.UploadFileAsync(stream, file.FileName);
        product.ModelId = asset.Id;

        await Context.SaveChangesAsync();

        return await GetProduct(id);
    }

    /// <summary>
    /// Deletes a product 3D model.
    /// </summary>
    [HttpDelete("{id:guid}/model")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponse>> DeleteProductModel(Guid id)
    {
        var product = await Context.Products.Include(p => p.Model).FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            return NotFound(new { message = "Product not found" });

        if (product.Model == null)
            return BadRequest(new { message = "Product has no 3D model" });

        await storageService.DeleteFileAsync(product.Model);
        Context.Assets.Remove(product.Model);
        product.ModelId = null;

        await Context.SaveChangesAsync();

        return await GetProduct(id);
    }
}
