namespace PrintlyServer.Data.Entities;

/// <summary>
/// System announcements from admins to all users
/// </summary>
public class Broadcast : BaseEntity
{
    public required string SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public required string Title { get; set; }
    public required string Content { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
}
