using Microsoft.AspNetCore.Mvc;
using MocklyServer.Services;

namespace MocklyServer.Controllers;

[Route("design")]
public class DesignController(AppDatabase context, GeminiService geminiService) : BaseController(context)
{
    [HttpGet]
    [Route("generate")]
    public async Task<IActionResult> GenerateImage([FromQuery] string prompt)
    {
        var data = await geminiService.GenerateImageAsync(prompt);
        return File(data, "image/png");
    }
}