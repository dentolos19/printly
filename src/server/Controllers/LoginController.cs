using EnterpriseServer.Auth;
using Microsoft.AspNetCore.Identity;
using EnterpriseServer.Models;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseServer.Controllers;

public class LoginController(
    AppDbContext context,
    UserManager<User> userManager
    ) : BaseController(context)
{

    [HttpPost]
    [Route("/api/register")]
    public async Task<IActionResult> Register(User user) {
        var result = await userManager.CreateAsync(user);

        if (result.Succeeded)
        {
            var roleResult = await userManager.AddToRoleAsync(user, Roles.User);

            if (!roleResult.Succeeded)
            {
                return BadRequest(roleResult.Errors);
            }

            return Ok();
        }

        return BadRequest(result.Errors);

    }
}