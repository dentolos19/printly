// app.MapGet("/", () =>
// {
//     return "Welcome to Enterprise API!";
// }).WithName("GetRoot") ;
//
// app.MapGet("/testLogin", [Authorize(Policy = Policies.LoggedIn)] () => "Hello, World!");
//
// app.MapGet("/environment", () =>
// {
//     var variables = Environment.GetEnvironmentVariables()
//         .Cast<System.Collections.DictionaryEntry>()
//         .ToDictionary(x => x.Key.ToString() ?? string.Empty, x => x.Value?.ToString() ?? string.Empty)
//         .Where(x => !string.IsNullOrEmpty(x.Value))
//         .Where(x => !string.IsNullOrEmpty(x.Key))
//         .ToDictionary(x => x.Key, x => x.Value);
//     return variables;
// }).WithName("GetEnvironmentVariables");

using EnterpriseServer.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseServer.Controllers;

public class RootController(AppDbContext context) : BaseController(context)
{
    [HttpGet]
    [Route("/")]
    public IActionResult GetRoot() {
        return Ok("Welcome to Enterprise API!");
    }

    [HttpGet]
    [Authorize(Policy = Policies.LoggedIn)]
    [Route("/testlogin")]
    public IActionResult TestLoginAction() {
        return Ok("Hello, World!");
    }

    [HttpGet]
    [Route("/environment")]
    public IActionResult GetEnvironmentVariables() {
        var variables = Environment.GetEnvironmentVariables()
            .Cast<System.Collections.DictionaryEntry>()
            .ToDictionary(x => x.Key.ToString() ?? string.Empty, x => x.Value?.ToString() ?? string.Empty)
            .Where(x => !string.IsNullOrEmpty(x.Value))
            .Where(x => !string.IsNullOrEmpty(x.Key))
            .ToDictionary(x => x.Key, x => x.Value);
        return Ok(variables);
    }
}