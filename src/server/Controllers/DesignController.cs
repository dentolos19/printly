using Microsoft.AspNetCore.Mvc;
using PrintlyServer.Data;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("design")]
public class DesignController(DatabaseContext context, StorageService storageService, GenerativeService generativeService) : BaseController(context)
{
    [HttpGet]
    [Route("generate")]
    public async Task<IActionResult> GenerateImage([FromQuery] string prompt)
    {
        var asset = await generativeService.GenerateImageAsync(prompt);
        var stream = await storageService.StreamFileAsync(asset);
        return File(stream, asset.Type);
    }
}