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
        if (!Guid.TryParse(id, out var assetId))
            return BadRequest(new { message = "Invalid asset ID format" });

        var asset = await Context
            .Assets.Where(a => a.Id == assetId && !a.IsDeleted)
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

        // Generate inline thumbnail for image assets (keeps previews fast and resilient)
        if (asset.Type.StartsWith("image/") && file.Length < 10_000_000)
        {
            try
            {
                await using var thumbnailStream = file.OpenReadStream();
                var bytes = new byte[file.Length];
                _ = await thumbnailStream.ReadAsync(bytes);
                // Store raw bytes if small enough for a thumbnail (< 100KB original)
                if (bytes.Length <= 102_400)
                {
                    asset.ThumbnailData = bytes;
                    asset.ThumbnailType = asset.Type;
                }
            }
            catch
            {
                // Non-critical; skip thumbnail generation
            }
        }

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
        if (!Guid.TryParse(id, out var assetId))
            return BadRequest(new { message = "Invalid asset ID format" });

        var asset = await Context.Assets.FirstOrDefaultAsync(a => a.Id == assetId && !a.IsDeleted);

        if (asset is null)
            return NotFound();

        var downloadUrl = await storageService.DownloadFileAsync(asset);

        return Ok(new { url = downloadUrl });
    }

    /// <summary>
    /// Serves the inline thumbnail for an asset if available.
    /// Falls back to 404 so the client can use the full /download path instead.
    /// </summary>
    [HttpGet("{id}/thumbnail")]
    [AllowAnonymous]
    public async Task<IActionResult> GetThumbnail(string id)
    {
        if (!Guid.TryParse(id, out var assetId))
            return BadRequest(new { message = "Invalid asset ID format" });

        var asset = await Context
            .Assets.Where(a => a.Id == assetId && !a.IsDeleted && a.ThumbnailData != null)
            .Select(a => new { a.ThumbnailData, a.ThumbnailType })
            .FirstOrDefaultAsync();

        if (asset?.ThumbnailData is null)
            return NotFound();

        return File(asset.ThumbnailData, asset.ThumbnailType ?? "image/png");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AssetResponse>> UpdateAsset(string id, [FromBody] UpdateAssetDto body)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        if (!Guid.TryParse(id, out var assetId))
            return BadRequest(new { message = "Invalid asset ID format" });

        var asset = await Context.Assets.FirstOrDefaultAsync(a =>
            a.Id == assetId && a.UserId == userId && !a.IsDeleted
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

        if (!Guid.TryParse(id, out var assetId))
            return BadRequest(new { message = "Invalid asset ID format" });

        var asset = await Context.Assets.FirstOrDefaultAsync(a =>
            a.Id == assetId && a.UserId == userId && !a.IsDeleted
        );

        if (asset is null)
            return NotFound();

        // Use the storage service's soft delete method
        await storageService.DeleteFileAsync(asset);

        return NoContent();
    }
}
