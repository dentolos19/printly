using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EnterpriseServer.Auth;
using EnterpriseServer.Models;
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
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var userDto = new User { UserName = dto.Name, Email = dto.Email };

        var userResult = await userManager.CreateAsync(userDto, dto.Password);
        if (!userResult.Succeeded)
            return BadRequest(userResult.Errors);

        var roleResult = await userManager.AddToRoleAsync(userDto, Roles.User);
        if (!roleResult.Succeeded)
            return BadRequest(roleResult.Errors);

        return Ok(new { message = "User registered" });
    }

    [HttpPost]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user == null || !await userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized();

        var token = GenerateJwtToken(user);
        return Ok(new { token });
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["SECRET_KEY"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}