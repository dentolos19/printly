using Microsoft.AspNetCore.Mvc;

namespace PrintlyServer.Controllers;

/// <summary>
/// A custom implementation of <see cref="ControllerBase"/> that
/// <list type="bullet">
/// <item><description>
/// Automatically injects the project's global database context (<see cref="DatabaseContext"/>)
/// </description></item>
/// <item><description>
/// Implements <see cref="ApiControllerAttribute"/> such that all controllers inheriting from it will receive it as well
/// </description></item>
/// <item><description>
/// Sets the default route to /controller/actionname
/// </description></item>
/// </list>
/// </summary>
/// <example>
/// <code>
/// //How to inherit from BaseController:
/// public class MyController(AppDbContext context) : BaseController(context)
/// {
///     //at this point, the db is already included
/// }
/// </code>
/// </example>
/// <param name="context">A readonly reference to the database (this part is handled by ASP already via the builder instructions in the main Program.cs file), used inside each controller via the inherited property <see cref="Context"/></param>
[ApiController]
[Route("[controller]")]
public class BaseController(DatabaseContext context) : ControllerBase
{
    protected readonly DatabaseContext Context = context;
}