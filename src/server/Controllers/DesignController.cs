using Microsoft.AspNetCore.Mvc;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("design")]
public class DesignController(DatabaseContext context, GeminiService geminiService) : BaseController(context)
{
    [HttpGet]
    [Route("generate")]
    public async Task<IActionResult> GenerateImage([FromQuery] string prompt)
    {
        var data = await geminiService.GenerateImageAsync(prompt);
        return File(data, "image/png");
    }
}