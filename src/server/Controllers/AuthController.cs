using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MocklyServer.Services;

namespace MocklyServer.Controllers;

[Route("auth")]
[Tags("Authentication")]
public class AuthController(DatabaseContext context, IdentityService identityService) : BaseController(context)
{
    public record RegisterDto(string Name, string Email, string Password);

    public record LoginDto(string Email, string Password);

    public record RefreshDto(string RefreshToken);

    public record AuthResponse(string AccessToken, string RefreshToken);

    [HttpPost]
    [Route("register")]
    public async Task<IActionResult> RegisterUser([FromBody] RegisterDto body)
    {
        await identityService.CreateUser(body.Email, body.Password);
        return Ok();
    }

    [HttpPost]
    [Route("login")]
    public async Task<IActionResult> LoginUser([FromBody] LoginDto body)
    {
        // Verify user credentials
        var user = await identityService.GetUserWithPassword(body.Email, body.Password);

        // Check if credentials are valid
        if (user == null)
            return Unauthorized();

        // Grant access token and generate refresh token
        var (accessToken, refreshToken) = await identityService.GrantUserAccess(user);

        return Ok(new AuthResponse(accessToken, refreshToken));
    }

    [HttpGet]
    [Route("google")]
    public IActionResult LoginGoogle([FromQuery] string returnUrl)
    {
        var url = Url.Action(nameof(LoginGoogleSuccess), "Auth", new { returnUrl }, HttpContext.Request.Scheme);
        var properties = new AuthenticationProperties { RedirectUri = url };
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet]
    [Route("google/success")]
    public async Task<IActionResult> LoginGoogleSuccess([FromQuery] string returnUrl)
    {
        // Authenticate the user with Google
        var result = await HttpContext.AuthenticateAsync(IdentityConstants.ExternalScheme);

        // Check if authentication was successful
        if (!result.Succeeded || result.Principal == null)
            return Unauthorized();

        // Extract email from claims
        var email = result.Principal.FindFirstValue(ClaimTypes.Email);

        // Find or create the user
        var user = await identityService.GetUser(email!);
        user ??= await identityService.CreateUser(email!);

        // Grant access token and generate refresh token
        var (accessToken, refreshToken) = await identityService.GrantUserAccess(user);

        // Redirect to the return URL with tokens
        return Redirect($"{returnUrl}?accessToken={accessToken}&refreshToken={refreshToken}");
    }

    [HttpPost]
    [Route("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshDto body)
    {
        // Find current refresh token
        var refreshToken = await identityService.FindRefreshToken(body.RefreshToken);

        // Validate the current refresh token
        if (refreshToken == null || !refreshToken.IsActive)
            return Unauthorized();

        // Rotate the refresh token and generate a new access token
        var (accessToken, newRefreshToken) = await identityService.ExtendUserAccess(refreshToken.User, refreshToken);

        return Ok(new AuthResponse(accessToken, newRefreshToken));
    }

    [HttpPost]
    [Route("revoke")]
    public async Task<IActionResult> RevokeToken([FromBody] RefreshDto body)
    {
        var refreshToken = await identityService.FindRefreshToken(body.RefreshToken);

        // Validate the refresh token
        if (refreshToken == null || !refreshToken.IsActive)
            return BadRequest();

        // Revoke the refresh token
        await identityService.RevokeUserToken(refreshToken);

        return Ok();
    }
}