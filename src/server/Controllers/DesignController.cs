using EnterpriseServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseServer.Controllers;

public class DesignController(AppDbContext context) : BaseController(context)
{
    [HttpGet]
    [Route("generate")]
    public async Task<IActionResult> GenerateImage(
        [FromServices] GeminiService geminiService,
        [FromQuery] string prompt
    )
    {
        var data = await geminiService.GenerateImageAsync(prompt);
        return File(data, "image/png");
    }
}