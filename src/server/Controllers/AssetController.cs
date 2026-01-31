using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("asset")]
[Authorize(Roles = "User,Admin")]
public class AssetController(DatabaseContext context, StorageService storageService) : BaseController(context)
{
    public record AssetResponse(
        Guid Id,
        string Name,
        string? Description,
        string Type,
        string Hash,
        long Size,
        bool IsGenerated,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record UpdateAssetDto(string? Name, string? Description);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AssetResponse>>> GetAssets()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var assets = await Context
            .Assets.Where(a => a.UserId == userId && !a.IsDeleted && a.Category != AssetCategory.Cover)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AssetResponse(
                a.Id,
                a.Name,
                a.Description,
                a.Type,
                a.Hash,
                a.Size,
                a.IsGenerated,
                a.CreatedAt,
                a.UpdatedAt
            ))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<AssetResponse>> GetAsset(string id)
    {
        var asset = await Context
            .Assets.Where(a => a.Id == Guid.Parse(id) && !a.IsDeleted)
            .Select(a => new AssetResponse(
                a.Id,
                a.Name,
                a.Description,
                a.Type,
                a.Hash,
                a.Size,
                a.IsGenerated,
                a.CreatedAt,
                a.UpdatedAt
            ))
            .FirstOrDefaultAsync();

        if (asset is null)
            return NotFound();

        return Ok(asset);
    }

    [HttpPost]
    [RequestSizeLimit(100_000_000)] // 100 MB
    public async Task<ActionResult<AssetResponse>> UploadAsset(
        IFormFile file,
        [FromForm] string? description = null,
        [FromForm] string? category = null
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        if (file is null || file.Length == 0)
            return BadRequest("No file uploaded.");

        // Upload file to storage and create database record
        await using var stream = file.OpenReadStream();
        var asset = await storageService.UploadFileAsync(stream, file.FileName, category);

        // Associate the asset with the current user
        asset.UserId = userId;
        asset.Description = description;
        asset.CreatedAt = DateTime.UtcNow;
        asset.UpdatedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        var response = new AssetResponse(
            asset.Id,
            asset.Name,
            asset.Description,
            asset.Type,
            asset.Hash,
            asset.Size,
            asset.IsGenerated,
            asset.CreatedAt,
            asset.UpdatedAt
        );

        return CreatedAtAction(nameof(GetAsset), new { id = asset.Id }, response);
    }

    [HttpGet("{id}/download")]
    [AllowAnonymous]
    public async Task<ActionResult<string>> DownloadAsset(string id)
    {
        var asset = await Context.Assets.FirstOrDefaultAsync(a => a.Id == Guid.Parse(id) && !a.IsDeleted);

        if (asset is null)
            return NotFound();

        var downloadUrl = await storageService.DownloadFileAsync(asset);

        return Ok(new { url = downloadUrl });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AssetResponse>> UpdateAsset(string id, [FromBody] UpdateAssetDto body)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var asset = await Context.Assets.FirstOrDefaultAsync(a =>
            a.Id == Guid.Parse(id) && a.UserId == userId && !a.IsDeleted
        );

        if (asset is null)
            return NotFound();

        if (body.Name is not null)
            asset.Name = body.Name;

        if (body.Description is not null)
            asset.Description = body.Description;

        asset.UpdatedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        var response = new AssetResponse(
            asset.Id,
            asset.Name,
            asset.Description,
            asset.Type,
            asset.Hash,
            asset.Size,
            asset.IsGenerated,
            asset.CreatedAt,
            asset.UpdatedAt
        );

        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsset(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var asset = await Context.Assets.FirstOrDefaultAsync(a =>
            a.Id == Guid.Parse(id) && a.UserId == userId && !a.IsDeleted
        );

        if (asset is null)
            return NotFound();

        // Use the storage service's soft delete method
        await storageService.DeleteFileAsync(asset);

        return NoContent();
    }
}
