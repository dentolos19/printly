using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;

namespace PrintlyServer.Controllers;

[Route("imprint")]
[Authorize(Roles = "User,Admin")]
public class ImprintController(DatabaseContext context) : BaseController(context)
{
    public record CreateImprintDto(
        string Name,
        string? Description,
        string Data,
        Guid? ProductId = null,
        Guid? PreviewId = null
    );

    public record UpdateImprintDto(
        string? Name,
        string? Description,
        string? Data,
        Guid? ProductId = null,
        Guid? PreviewId = null
    );

    public record ImprintResponse(
        Guid Id,
        string Name,
        string? Description,
        string Data,
        Guid? ProductId,
        string? ProductName,
        Guid? PreviewId,
        decimal CustomizationPrice,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ImprintValidationResponse(bool IsValid, decimal CustomizationPrice, string? Message);

    /// <summary>
    /// Gets all imprints for the authenticated user.
    /// </summary>
    /// <returns>A list of imprints owned by the current user.</returns>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ImprintResponse>>> GetImprints()
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var imprints = await Context
            .Imprints.Where(i => i.UserId == userId)
            .Include(i => i.Product)
            .OrderByDescending(i => i.UpdatedAt)
            .Select(i => new ImprintResponse(
                i.Id,
                i.Name,
                i.Description,
                i.Data,
                i.ProductId,
                i.Product != null ? i.Product.Name : null,
                i.PreviewId,
                i.CustomizationPrice,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .ToListAsync();

        return Ok(imprints);
    }

    /// <summary>
    /// Gets a specific imprint by ID.
    /// </summary>
    /// <param name="id">The ID of the imprint to retrieve.</param>
    /// <returns>The imprint if found and owned by the user.</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ImprintResponse>> GetImprint(string id)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var imprint = await Context
            .Imprints.Where(i => i.Id == Guid.Parse(id) && i.UserId == userId)
            .Include(i => i.Product)
            .Select(i => new ImprintResponse(
                i.Id,
                i.Name,
                i.Description,
                i.Data,
                i.ProductId,
                i.Product != null ? i.Product.Name : null,
                i.PreviewId,
                i.CustomizationPrice,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .FirstOrDefaultAsync();

        if (imprint is null)
            return NotFound();

        return Ok(imprint);
    }

    /// <summary>
    /// Creates a new imprint for the authenticated user.
    /// </summary>
    /// <param name="body">The imprint data to create.</param>
    /// <returns>The created imprint.</returns>
    [HttpPost]
    public async Task<ActionResult<ImprintResponse>> CreateImprint([FromBody] CreateImprintDto body)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        // Validate product exists if ProductId is provided
        Product? product = null;
        if (body.ProductId.HasValue)
        {
            product = await Context.Products.FirstOrDefaultAsync(p => p.Id == body.ProductId.Value);
            if (product is null)
                return BadRequest(new { message = "Product not found" });
        }

        var imprint = new Imprint
        {
            Id = Guid.NewGuid(),
            Name = body.Name,
            Description = body.Description,
            Data = body.Data,
            UserId = userId,
            ProductId = body.ProductId,
            PreviewId = body.PreviewId,
            CustomizationPrice = 5.00m, // Default constant price for now
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        Context.Imprints.Add(imprint);
        await Context.SaveChangesAsync();

        var response = new ImprintResponse(
            imprint.Id,
            imprint.Name,
            imprint.Description,
            imprint.Data,
            imprint.ProductId,
            product?.Name,
            imprint.PreviewId,
            imprint.CustomizationPrice,
            imprint.CreatedAt,
            imprint.UpdatedAt
        );

        return CreatedAtAction(nameof(GetImprint), new { id = imprint.Id }, response);
    }

    /// <summary>
    /// Updates an existing imprint.
    /// </summary>
    /// <param name="id">The ID of the imprint to update.</param>
    /// <param name="body">The updated imprint data.</param>
    /// <returns>The updated imprint.</returns>
    [HttpPut("{id}")]
    public async Task<ActionResult<ImprintResponse>> UpdateImprint(string id, [FromBody] UpdateImprintDto body)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var imprint = await Context
            .Imprints.Include(i => i.Product)
            .FirstOrDefaultAsync(i => i.Id == Guid.Parse(id) && i.UserId == userId);

        if (imprint is null)
            return NotFound();

        if (body.Name is not null)
            imprint.Name = body.Name;

        if (body.Description is not null)
            imprint.Description = body.Description;

        if (body.Data is not null)
            imprint.Data = body.Data;

        // Handle ProductId update
        if (body.ProductId.HasValue)
        {
            var product = await Context.Products.FirstOrDefaultAsync(p => p.Id == body.ProductId.Value);
            if (product is null)
                return BadRequest(new { message = "Product not found" });
            imprint.ProductId = body.ProductId;
            imprint.Product = product;
        }

        // Handle PreviewId update
        if (body.PreviewId.HasValue)
        {
            imprint.PreviewId = body.PreviewId;
        }

        imprint.UpdatedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        var response = new ImprintResponse(
            imprint.Id,
            imprint.Name,
            imprint.Description,
            imprint.Data,
            imprint.ProductId,
            imprint.Product?.Name,
            imprint.PreviewId,
            imprint.CustomizationPrice,
            imprint.CreatedAt,
            imprint.UpdatedAt
        );

        return Ok(response);
    }

    /// <summary>
    /// Validates if an imprint can be used with a specific product.
    /// </summary>
    /// <param name="imprintId">The ID of the imprint to validate.</param>
    /// <param name="productId">The ID of the product to validate against.</param>
    /// <returns>Validation result with customization price.</returns>
    [HttpGet("{imprintId}/validate/{productId}")]
    public async Task<ActionResult<ImprintValidationResponse>> ValidateImprintForProduct(Guid imprintId, Guid productId)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var imprint = await Context.Imprints.FirstOrDefaultAsync(i => i.Id == imprintId && i.UserId == userId);

        if (imprint is null)
            return NotFound(new ImprintValidationResponse(false, 0, "Imprint not found"));

        // Check if product exists
        var product = await Context.Products.FirstOrDefaultAsync(p => p.Id == productId);
        if (product is null)
            return NotFound(new ImprintValidationResponse(false, 0, "Product not found"));

        // Check if imprint is compatible (has no product restriction or matches target product)
        bool isValid = !imprint.ProductId.HasValue || imprint.ProductId == productId;

        if (!isValid)
            return Ok(
                new ImprintValidationResponse(
                    false,
                    imprint.CustomizationPrice,
                    "Imprint is not compatible with selected product"
                )
            );

        return Ok(new ImprintValidationResponse(true, imprint.CustomizationPrice, null));
    }

    /// <summary>
    /// Deletes an imprint by ID.
    /// </summary>
    /// <param name="id">The ID of the imprint to delete.</param>
    /// <returns>No content if successful.</returns>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteImprint(string id)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var imprint = await Context.Imprints.FirstOrDefaultAsync(i => i.Id == Guid.Parse(id) && i.UserId == userId);

        if (imprint is null)
            return NotFound();

        Context.Imprints.Remove(imprint);
        await Context.SaveChangesAsync();

        return NoContent();
    }
}
