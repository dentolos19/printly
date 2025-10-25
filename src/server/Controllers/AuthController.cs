using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EnterpriseServer.Auth;
using EnterpriseServer.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace EnterpriseServer.Controllers;

public class AuthController(AppDbContext context, IConfiguration configuration, UserManager<User> userManager)
    : BaseController(context)
{
    public record RegisterDto(string Name, string Email, string Password);

    public record LoginDto(string Email, string Password);

    [HttpPost]
    [Route("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var userDto = new User { UserName = dto.Email, Email = dto.Email };

        var userResult = await userManager.CreateAsync(userDto, dto.Password);
        if (!userResult.Succeeded)
            return BadRequest(userResult.Errors);

        var roleResult = await userManager.AddToRoleAsync(userDto, Roles.User);
        if (!roleResult.Succeeded)
            return BadRequest(roleResult.Errors);

        return Ok(new { message = "User registered" });
    }

    [HttpPost]
    [Route("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user == null || !await userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized();

        var token = await GenerateJwtToken(user);
        return Ok(new { token });
    }

    [HttpGet]
    [Route("google")]
    public IActionResult LoginGoogle([FromQuery] string returnUrl)
    {
        var redirectUrl = Url.Action(
            nameof(LoginGoogleCallback),
            "Auth",
            new { returnUrl },
            HttpContext.Request.Scheme
        );

        var properties = new AuthenticationProperties { RedirectUri = redirectUrl };
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet]
    [Route("google/callback")]
    public async Task<IActionResult> LoginGoogleCallback([FromQuery] string returnUrl)
    {
        var result = await HttpContext.AuthenticateAsync(IdentityConstants.ExternalScheme);
        if (!result.Succeeded || result.Principal == null)
            return Unauthorized();

        var email = result.Principal.FindFirstValue(ClaimTypes.Email);
        var user = await userManager.FindByEmailAsync(email!);

        if (user == null)
        {
            user = new User { UserName = email, Email = email };

            var userResult = await userManager.CreateAsync(user);
            if (!userResult.Succeeded)
                return BadRequest(userResult.Errors);

            var roleResult = await userManager.AddToRoleAsync(user, Roles.User);
            if (!roleResult.Succeeded)
                return BadRequest(roleResult.Errors);
        }

        var token = await GenerateJwtToken(user);
        return Redirect($"{returnUrl}?token={token}");
    }

    private async Task<string> GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["SECRET_KEY"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var roles = await userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(ClaimTypes.Name, user.UserName ?? ""),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}