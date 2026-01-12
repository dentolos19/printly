using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        await Context.SaveChangesAsync();

        var stream = await storageService.StreamFileAsync(asset);
        return File(stream, asset.Type);
    }
}
