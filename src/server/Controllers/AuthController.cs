using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EnterpriseServer.Auth;
using EnterpriseServer.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EnterpriseServer.Controllers;

public class AuthController(AppDbContext context, IConfiguration configuration, UserManager<User> userManager)
    : BaseController(context)
{
    public record RegisterDto(string Name, string Email, string Password);

    public record LoginDto(string Email, string Password);

    public record RefreshDto(string RefreshToken);

    public record AuthResponse(string AccessToken, string RefreshToken);

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

        var accessToken = await GenerateAccessToken(user);
        var refreshToken = await GenerateRefreshToken(user);
        return Ok(new AuthResponse(accessToken, refreshToken.Token));
    }

    [HttpGet]
    [Route("google")]
    public IActionResult LoginGoogle([FromQuery] string returnUrl)
    {
        var redirectUrl = Url.Action(nameof(LoginGoogleSuccess), "Auth", new { returnUrl }, HttpContext.Request.Scheme);
        var properties = new AuthenticationProperties { RedirectUri = redirectUrl };
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet]
    [Route("google/success")]
    public async Task<IActionResult> LoginGoogleSuccess([FromQuery] string returnUrl)
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

        var accessToken = await GenerateAccessToken(user);
        var refreshToken = await GenerateRefreshToken(user);
        return Redirect($"{returnUrl}?accessToken={accessToken}&refreshToken={refreshToken.Token}");
    }

    [HttpPost]
    [Route("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshDto dto)
    {
        var currentRefreshToken = await Context
            .RefreshTokens.Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == dto.RefreshToken);

        if (currentRefreshToken == null || !currentRefreshToken.IsActive)
            return Unauthorized(new { message = "Invalid refresh token" });

        var accessToken = await GenerateAccessToken(currentRefreshToken.User);
        var refreshToken = await RotateRefreshToken(currentRefreshToken);
        return Ok(new AuthResponse(accessToken, refreshToken.Token));
    }

    [HttpPost]
    [Route("revoke")]
    public async Task<IActionResult> Revoke([FromBody] RefreshDto dto)
    {
        var refreshToken = await Context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == dto.RefreshToken);

        if (refreshToken == null || !refreshToken.IsActive)
            return BadRequest(new { message = "Invalid refresh token" });

        refreshToken.RevokedAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();

        return Ok(new { message = "Token revoked" });
    }

    private async Task<string> GenerateAccessToken(User user)
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

    private async Task<RefreshToken> GenerateRefreshToken(User user)
    {
        var refreshToken = new RefreshToken
        {
            Token = GenerateSecureToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
            UserId = user.Id,
        };

        Context.RefreshTokens.Add(refreshToken);
        await Context.SaveChangesAsync();

        return refreshToken;
    }

    private async Task<RefreshToken> RotateRefreshToken(RefreshToken refreshToken)
    {
        refreshToken.RevokedAt = DateTime.UtcNow;

        var newRefreshToken = new RefreshToken
        {
            Token = GenerateSecureToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
            UserId = refreshToken.UserId,
        };

        refreshToken.ReplacedByToken = newRefreshToken.Token;
        Context.RefreshTokens.Add(newRefreshToken);
        await Context.SaveChangesAsync();

        return newRefreshToken;
    }

    private string GenerateSecureToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}