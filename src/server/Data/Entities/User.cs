using Microsoft.AspNetCore.Identity;
using PrintlyServer.Data.Auth;

namespace PrintlyServer.Data.Entities;

public class User : IdentityUser
{
    public List<RefreshToken> RefreshTokens { get; set; } = [];
    public string Role { get; set; } = Roles.User; // Using the Roles class makes it safer

    public ICollection<UserFollower> Followers { get; set; } = new List<UserFollower>();
    public ICollection<UserFollower> Following { get; set; } = new List<UserFollower>();
}
