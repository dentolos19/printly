using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MocklyServer.Auth;
using MocklyServer.Models;

namespace MocklyServer.Services;

public class IdentityService(IConfiguration configuration, DatabaseContext database, UserManager<User> userManager)
{
    private async Task<string> GenerateAccessToken(User user)
    {
        // Generate signing credentials
        var keyData = SHA256.HashData(Encoding.UTF8.GetBytes(configuration["SECRET_KEY"]!));
        var key = new SymmetricSecurityKey(keyData);
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var roles = await userManager.GetRolesAsync(user);

        // Define claims accessible for the frontend
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Role, roles.FirstOrDefault() ?? Roles.User),
        };

        // Create token descriptor
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        // Serialize and generate token
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<RefreshToken> GenerateRefreshToken(User user)
    {
        var token = new RefreshToken
        {
            Token = Utilities.GenerateSecureToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
            UserId = user.Id,
        };

        // Save the refresh token to the database
        database.RefreshTokens.Add(token);
        await database.SaveChangesAsync();

        return token;
    }

    private async Task<RefreshToken> RotateRefreshToken(RefreshToken refreshToken)
    {
        var token = new RefreshToken
        {
            Token = Utilities.GenerateSecureToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
            UserId = refreshToken.UserId,
        };

        // Replace and revoke the old refresh token
        refreshToken.RevokedAt = DateTime.UtcNow;
        refreshToken.ReplacedByToken = token.Token;
        database.RefreshTokens.Add(token);
        await database.SaveChangesAsync();

        return token;
    }

    public async Task<User?> VerifyUserCredentials(string email, string password)
    {
        var user = await userManager.FindByEmailAsync(email);

        if (user == null || !await userManager.CheckPasswordAsync(user, password))
            return null;

        return user;
    }

    public async Task<RefreshToken?> FindRefreshToken(string token)
    {
        return await database.RefreshTokens.Include(rt => rt.User).FirstOrDefaultAsync(rt => rt.Token == token);
    }

    public async Task<User> CreateUser(string email, string? password = null)
    {
        var user = new User { UserName = email, Email = email };

        var userResult = string.IsNullOrEmpty(password)
            ? await userManager.CreateAsync(user)
            : await userManager.CreateAsync(user, password);

        if (!userResult.Succeeded)
            throw new Exception("Failed to create user.");

        var roleResult = await userManager.AddToRoleAsync(user, Roles.User);

        if (!roleResult.Succeeded)
            throw new Exception("Failed to assign role to user.");

        return user;
    }

    public async Task<User> GetUser(string email)
    {
        var user = await userManager.FindByEmailAsync(email) ?? throw new Exception("User not found.");
        return user;
    }

    public async Task<(string, string)> GrantUserAccess(User user)
    {
        var accessToken = await GenerateAccessToken(user);
        var refreshToken = await GenerateRefreshToken(user);
        return (accessToken, refreshToken.Token);
    }

    public async Task<(string, string)> ExtendUserAccess(User user, RefreshToken token)
    {
        var accessToken = await GenerateAccessToken(user);
        var refreshToken = await RotateRefreshToken(token);
        return (accessToken, refreshToken.Token);
    }

    public async Task RevokeUserToken(RefreshToken token)
    {
        token.RevokedAt = DateTime.UtcNow;
        await database.SaveChangesAsync();
    }
}