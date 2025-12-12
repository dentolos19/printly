using Microsoft.AspNetCore.Identity;

namespace PrintlyServer.Data.Entities;

public class User : IdentityUser
{
    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
