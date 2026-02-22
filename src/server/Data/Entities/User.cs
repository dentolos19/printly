using Microsoft.AspNetCore.Identity;
using PrintlyServer.Data.Auth;

namespace PrintlyServer.Data.Entities;

public class User : IdentityUser
{
    public List<RefreshToken> RefreshTokens { get; set; } = [];
    public string Role { get; set; } = Roles.User;

    // Profile fields
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public Guid? AvatarId { get; set; }
    public Asset? Avatar { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Privacy
    public bool IsPrivate { get; set; } = false;

    // Moderation
    public bool IsBanned { get; set; } = false;
    public string? BanReason { get; set; }

    public ICollection<UserFollower> Followers { get; set; } = new List<UserFollower>();
    public ICollection<UserFollower> Following { get; set; } = new List<UserFollower>();
}
