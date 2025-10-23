using Microsoft.AspNetCore.Mvc;

namespace EnterpriseServer.Controllers;

public class RootController(AppDbContext context) : BaseController(context)
{
    [HttpGet]
    [Route("/")]
    public IActionResult GetRoot()
    {
        return Ok("Welcome to Enterprise API!");
    }

    [HttpGet]
    [Route("/environment")]
    public IActionResult GetEnvironment()
    {
        var variables = Environment
            .GetEnvironmentVariables()
            .Cast<System.Collections.DictionaryEntry>()
            .ToDictionary(x => x.Key.ToString() ?? string.Empty, x => x.Value?.ToString() ?? string.Empty)
            .Where(x => !string.IsNullOrEmpty(x.Value) && !string.IsNullOrEmpty(x.Key));
        return Ok(variables);
    }
}