using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("generate")]
[Authorize(Roles = $"{Roles.Admin},{Roles.User}")]
public class GenerateController(
    DatabaseContext context,
    StorageService storageService,
    GenerativeService generativeService
) : BaseController(context)
{
    public record GeneratedImageResponse(Guid Id, string Prompt, string? Style, string Type, DateTime CreatedAt);

    [HttpGet]
    [Route("text")]
    public async Task<IActionResult> GenerateText([FromQuery] string prompt)
    {
        var text = await generativeService.GenerateTextAsync(prompt);
        return Ok(text);
    }

    [HttpGet]
    [Route("image")]
    public async Task<IActionResult> GenerateImage([FromQuery] string prompt, [FromQuery] string? style = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var asset = await generativeService.GenerateImageAsync(prompt, style);

        asset.IsGenerated = true;
        asset.UserId = userId;
        asset.Description = style;
        await Context.SaveChangesAsync();

        Response.Headers.Append("X-Asset-Id", asset.Id.ToString());
        Response.Headers.Append("Access-Control-Expose-Headers", "X-Asset-Id");

        var stream = await storageService.StreamFileAsync(asset);
        return File(stream, asset.Type);
    }

    [HttpGet]
    [Route("images")]
    public async Task<ActionResult<IEnumerable<GeneratedImageResponse>>> GetGeneratedImages()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var images = await Context
            .Assets.Where(a => a.UserId == userId && a.IsGenerated && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .Select(a => new GeneratedImageResponse(a.Id, a.Name, a.Description, a.Type, a.CreatedAt))
            .ToListAsync();

        return Ok(images);
    }

    [HttpGet]
    [Route("images/{id}")]
    public async Task<IActionResult> GetGeneratedImage(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        if (!Guid.TryParse(id, out var assetId))
            return BadRequest(new { message = "Invalid asset ID format" });

        var asset = await Context.Assets.FirstOrDefaultAsync(a =>
            a.Id == assetId && a.UserId == userId && a.IsGenerated && !a.IsDeleted
        );

        if (asset is null)
            return NotFound();

        var stream = await storageService.StreamFileAsync(asset);
        return File(stream, asset.Type);
    }
}
