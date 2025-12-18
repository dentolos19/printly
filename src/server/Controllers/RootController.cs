using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;

namespace PrintlyServer.Controllers;

[Route("/")]
public class RootController(DatabaseContext context) : BaseController(context)
{
    [HttpGet]
    [Route("")]
    public IActionResult GetRoot()
    {
        return Ok("Welcome to Printly Server!");
    }

    [HttpGet]
    [Route("environment")]
    [Authorize(Roles = Roles.User)]
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
