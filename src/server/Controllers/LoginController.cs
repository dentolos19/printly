using System.Diagnostics;
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

    public class RegistrationData
    {
        public string Email {get; set;} = string.Empty;
        public string Password {get; set;} = string.Empty;
    }

    [HttpPost]
    [Route("/api/register")]
    public async Task<IActionResult> Register(RegistrationData userData) {

        //ASP uses the username to verify a person in the internal /login route
        var user = new User()
        {
            UserName = userData.Email,
            Email = userData.Email,
        };

        var result = await userManager.CreateAsync(user, password: userData.Password);

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