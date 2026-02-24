using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("generate")]
[Authorize(Roles = $"{Roles.Admin},{Roles.User}")]
public class GenerateController(
    DatabaseContext context,
    StorageService storageService,
    GenerativeService generativeService,
    CopyrightService copyrightService
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

        // Check prompt for copyrighted material and rewrite if needed
        var promptCheck = await copyrightService.CheckAndRewritePromptAsync(prompt);
        var effectivePrompt = promptCheck.HasViolation ? promptCheck.RewrittenPrompt : prompt;

        var asset = await generativeService.GenerateImageAsync(effectivePrompt, style);

        asset.IsGenerated = true;
        asset.UserId = userId;
        asset.Description = style;
        await Context.SaveChangesAsync();

        // Check the generated image for copyrighted content
        try
        {
            var downloadUrl = await storageService.DownloadFileAsync(asset);
            var imageCheck = await copyrightService.CheckImageAsync(downloadUrl);

            if (imageCheck.IsViolation)
            {
                await storageService.DeleteFileAsync(asset);
                return BadRequest(
                    new
                    {
                        message = "The generated image contains copyrighted material. Please try a different prompt.",
                        reason = imageCheck.Reason,
                        detectedItems = imageCheck.DetectedItems,
                        isCopyrightViolation = true,
                    }
                );
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GenerateController] Post-generation copyright check failed: {ex.Message}");
        }

        Response.Headers.Append("X-Asset-Id", asset.Id.ToString());
        Response.Headers.Append(
            "Access-Control-Expose-Headers",
            "X-Asset-Id, X-Prompt-Rewritten, X-Rewritten-Prompt, X-Rewrite-Explanation"
        );

        if (promptCheck.HasViolation)
        {
            Response.Headers.Append("X-Prompt-Rewritten", "true");
            Response.Headers.Append("X-Rewritten-Prompt", effectivePrompt);
            Response.Headers.Append(
                "X-Rewrite-Explanation",
                promptCheck.Explanation ?? "Prompt was modified to avoid copyrighted material."
            );
        }

        var stream = await storageService.StreamFileAsync(asset);
        return File(stream, asset.Type);
    }

    [HttpPost]
    [Route("check-prompt")]
    public async Task<IActionResult> CheckPrompt([FromBody] CheckPromptRequest request)
    {
        var result = await copyrightService.CheckAndRewritePromptAsync(request.Prompt);
        return Ok(
            new Dtos.PromptCheckResponse(
                result.HasViolation,
                result.DetectedTerms,
                result.RewrittenPrompt,
                result.Explanation
            )
        );
    }

    public record CheckPromptRequest(string Prompt);

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
