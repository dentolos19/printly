using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Services;

public class IdentityService
{
    private readonly IConfiguration _configuration;
    private readonly DatabaseContext _context;
    private readonly UserManager<User> _userManager;

    public IdentityService(IConfiguration configuration, DatabaseContext context, UserManager<User> userManager)
    {
        _configuration = configuration;
        _context = context;
        _userManager = userManager;
    }

    private async Task<string> GenerateAccessToken(User user)
    {
        // Generate signing credentials
        var keyData = SHA256.HashData(Encoding.UTF8.GetBytes(_configuration["SECRET_KEY"]!));
        var key = new SymmetricSecurityKey(keyData);
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var roles = await _userManager.GetRolesAsync(user);

        // Define claims accessible for the frontend
        // NOTE: ClaimTypes.NameIdentifier is required for SignalR's Context.UserIdentifier
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
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
        _context.RefreshTokens.Add(token);
        await _context.SaveChangesAsync();

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
        _context.RefreshTokens.Add(token);
        await _context.SaveChangesAsync();

        return token;
    }

    public async Task<RefreshToken?> FindRefreshToken(string token)
    {
        return await _context.RefreshTokens.Include(rt => rt.User).FirstOrDefaultAsync(rt => rt.Token == token);
    }

    public async Task<User> CreateUser(string email, string? password = null)
    {
        var user = new User { UserName = email, Email = email };

        var userResult = string.IsNullOrEmpty(password)
            ? await _userManager.CreateAsync(user)
            : await _userManager.CreateAsync(user, password);

        if (!userResult.Succeeded)
            throw new Exception("Failed to create user.");

        var roleResult = await _userManager.AddToRoleAsync(user, Roles.User);

        if (!roleResult.Succeeded)
            throw new Exception("Failed to assign role to user.");

        return user;
    }

    public async Task<User?> GetUser(string email)
    {
        return await _userManager.FindByEmailAsync(email);
    }

    public async Task<User?> GetUserWithPassword(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);
        return user != null && await _userManager.CheckPasswordAsync(user, password) ? user : null;
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
        await _context.SaveChangesAsync();
    }
}
