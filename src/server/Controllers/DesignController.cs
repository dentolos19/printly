using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;

namespace PrintlyServer.Controllers;

[Route("design")]
[Authorize(Roles = "User")]
public class DesignController(DatabaseContext context) : BaseController(context)
{
    public record CreateDesignDto(string Name, string? Description, string Data);

    public record UpdateDesignDto(string? Name, string? Description, string? Data);

    public record DesignResponse(
        Guid Id,
        string Name,
        string? Description,
        string Data,
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
            .Select(d => new DesignResponse(d.Id, d.Name, d.Description, d.Data, d.CreatedAt, d.UpdatedAt))
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

        var design = await Context
            .Designs.Where(d => d.Id == Guid.Parse(id) && d.UserId == userId)
            .Select(d => new DesignResponse(d.Id, d.Name, d.Description, d.Data, d.CreatedAt, d.UpdatedAt))
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

        Context.Designs.Add(design);
        await Context.SaveChangesAsync();

        var response = new DesignResponse(
            design.Id,
            design.Name,
            design.Description,
            design.Data,
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

        var design = await Context.Designs.FirstOrDefaultAsync(d => d.Id == Guid.Parse(id) && d.UserId == userId);

        if (design is null)
            return NotFound();

        if (body.Name is not null)
            design.Name = body.Name;

        if (body.Description is not null)
            design.Description = body.Description;

        if (body.Data is not null)
            design.Data = body.Data;

        design.UpdatedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        var response = new DesignResponse(
            design.Id,
            design.Name,
            design.Description,
            design.Data,
            design.CreatedAt,
            design.UpdatedAt
        );

        return Ok(response);
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

        var design = await Context.Designs.FirstOrDefaultAsync(d => d.Id == Guid.Parse(id) && d.UserId == userId);

        if (design is null)
            return NotFound();

        Context.Designs.Remove(design);
        await Context.SaveChangesAsync();

        return NoContent();
    }
}
