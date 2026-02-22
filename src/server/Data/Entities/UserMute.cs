namespace PrintlyServer.Data.Entities;

public class UserMute : BaseEntity
{
    public string MuterId { get; set; } = null!;
    public User Muter { get; set; } = null!;

    public string MutedId { get; set; } = null!;
    public User Muted { get; set; } = null!;
}
