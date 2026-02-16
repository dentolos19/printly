using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("design")]
[Authorize(Roles = "User,Admin")]
public class DesignController(DatabaseContext context, StorageService storageService) : BaseController(context)
{
    public record CreateDesignDto(string Name, string? Description, string Data, string? Cover);

    public record UpdateDesignDto(string? Name, string? Description, string? Data, string? Cover);

    public record DesignResponse(
        Guid Id,
        string Name,
        string? Description,
        string Data,
        Guid? CoverId,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    /// <summary>
    /// Gets all designs for the authenticated user.
    /// </summary>
    /// <returns>A list of designs owned by the current user.</returns>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DesignResponse>>> GetDesigns()
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var designs = await Context
            .Designs.Where(d => d.UserId == userId)
            .OrderByDescending(d => d.UpdatedAt)
            .Select(d => new DesignResponse(d.Id, d.Name, d.Description, d.Data, d.CoverId, d.CreatedAt, d.UpdatedAt))
            .ToListAsync();

        return Ok(designs);
    }

    /// <summary>
    /// Gets a specific design by ID.
    /// </summary>
    /// <param name="id">The ID of the design to retrieve.</param>
    /// <returns>The design if found and owned by the user.</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<DesignResponse>> GetDesign(string id)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        if (!Guid.TryParse(id, out var designId))
            return BadRequest(new { message = "Invalid design ID format" });

        var design = await Context
            .Designs.Where(d => d.Id == designId && d.UserId == userId)
            .Select(d => new DesignResponse(d.Id, d.Name, d.Description, d.Data, d.CoverId, d.CreatedAt, d.UpdatedAt))
            .FirstOrDefaultAsync();

        if (design is null)
            return NotFound();

        return Ok(design);
    }

    /// <summary>
    /// Creates a new design for the authenticated user.
    /// </summary>
    /// <param name="body">The design data to create.</param>
    /// <returns>The created design.</returns>
    [HttpPost]
    public async Task<ActionResult<DesignResponse>> CreateDesign([FromBody] CreateDesignDto body)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var design = new Design
        {
            Id = Guid.NewGuid(),
            Name = body.Name,
            Description = body.Description,
            Data = body.Data,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        // Handle cover image if provided (base64 data URL)
        if (!string.IsNullOrEmpty(body.Cover))
        {
            var coverAsset = await SaveCoverImage(body.Cover, design.Name, userId);
            if (coverAsset != null)
            {
                design.CoverId = coverAsset.Id;
            }
        }

        Context.Designs.Add(design);
        await Context.SaveChangesAsync();

        var response = new DesignResponse(
            design.Id,
            design.Name,
            design.Description,
            design.Data,
            design.CoverId,
            design.CreatedAt,
            design.UpdatedAt
        );

        return CreatedAtAction(nameof(GetDesign), new { id = design.Id }, response);
    }

    /// <summary>
    /// Updates an existing design.
    /// </summary>
    /// <param name="id">The ID of the design to update.</param>
    /// <param name="body">The updated design data.</param>
    /// <returns>The updated design.</returns>
    [HttpPut("{id}")]
    public async Task<ActionResult<DesignResponse>> UpdateDesign(string id, [FromBody] UpdateDesignDto body)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        if (!Guid.TryParse(id, out var designId))
            return BadRequest(new { message = "Invalid design ID format" });

        var design = await Context.Designs.FirstOrDefaultAsync(d => d.Id == designId && d.UserId == userId);

        if (design is null)
            return NotFound();

        if (body.Name is not null)
            design.Name = body.Name;

        if (body.Description is not null)
            design.Description = body.Description;

        if (body.Data is not null)
            design.Data = body.Data;

        // Handle cover image if provided (base64 data URL)
        if (!string.IsNullOrEmpty(body.Cover))
        {
            var coverAsset = await SaveCoverImage(body.Cover, design.Name, userId);
            if (coverAsset != null)
            {
                design.CoverId = coverAsset.Id;
            }
        }

        design.UpdatedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        var response = new DesignResponse(
            design.Id,
            design.Name,
            design.Description,
            design.Data,
            design.CoverId,
            design.CreatedAt,
            design.UpdatedAt
        );

        return Ok(response);
    }

    /// <summary>
    /// Gets a design's cover image.
    /// </summary>
    /// <param name="id">The ID of the design.</param>
    /// <returns>The cover image file.</returns>
    [HttpGet("{id}/cover")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDesignCover(string id)
    {
        if (!Guid.TryParse(id, out var designId))
            return BadRequest(new { message = "Invalid design ID format" });

        var design = await Context.Designs.Include(d => d.Cover).FirstOrDefaultAsync(d => d.Id == designId);

        if (design?.Cover is null)
            return NotFound();

        var stream = await storageService.StreamFileAsync(design.Cover);
        return File(stream, design.Cover.Type);
    }

    /// <summary>
    /// Deletes a design by ID.
    /// </summary>
    /// <param name="id">The ID of the design to delete.</param>
    /// <returns>No content if successful.</returns>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDesign(string id)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        if (!Guid.TryParse(id, out var designId))
            return BadRequest(new { message = "Invalid design ID format" });

        var design = await Context.Designs.FirstOrDefaultAsync(d => d.Id == designId && d.UserId == userId);

        if (design is null)
            return NotFound();

        Context.Designs.Remove(design);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Saves a base64 cover image as an asset.
    /// </summary>
    private async Task<Asset?> SaveCoverImage(string base64DataUrl, string designName, string userId)
    {
        try
        {
            // Parse the data URL (format: data:image/png;base64,...)
            var parts = base64DataUrl.Split(',');
            if (parts.Length != 2)
                return null;

            var base64Data = parts[1];
            var imageBytes = Convert.FromBase64String(base64Data);
            var stream = new MemoryStream(imageBytes);

            var asset = await storageService.UploadFileAsync(stream, $"{designName}-cover.png", AssetCategory.Cover);
            asset.UserId = userId;

            return asset;
        }
        catch
        {
            return null;
        }
    }
}
