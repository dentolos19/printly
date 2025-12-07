namespace PrintlyServer.Entities;

public class RefreshToken : BaseEntity
{
    public required string Token { get; set; }
    public string? ReplacedByToken { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    // Foreign Key
    public required string UserId { get; set; }
    public User User { get; set; } = null!;

    // Inferred Keys
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt != null;
    public bool IsActive => !IsRevoked && !IsExpired;
}