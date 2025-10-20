
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseServer.Controllers;

/// <summary>
/// A custom implementation of <see cref="ControllerBase"/> that
/// <list type="bullet">
/// <item><description>
/// Automatically injects the project's global database context (<see cref="AppDbContext"/>)
/// </description></item>
/// <item><description>
/// Implements <see cref="ApiControllerAttribute"/> such that all controllers inheriting from it will receive it as well
/// </description></item>
/// </list>
/// </summary>
/// <example>
/// <code>
/// //How to inherit from BaseController:
/// public class MyController(Db context) : BaseController(context)
/// {
///     //at this point, the db is already included
/// }
/// </code>
/// </example>
/// <param name="context">A reference to the database (this part is handled by ASP already via the builder instructions in the main Program.cs file), used inside each controller via the inherited property <see cref="Context"/></param>
[ApiController]
public class BaseController(AppDbContext context) : ControllerBase
{
    protected readonly AppDbContext Context = context;
}