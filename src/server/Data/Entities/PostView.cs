namespace PrintlyServer.Data.Entities;

public class PostView : BaseEntity
{
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public string? UserId { get; set; }
    public User? User { get; set; }

    public string? IpHash { get; set; }
}
