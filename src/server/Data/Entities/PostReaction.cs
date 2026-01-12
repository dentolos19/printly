namespace PrintlyServer.Data.Entities;

public class PostReaction : BaseEntity
{
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public string UserId { get; set; } = null!;
    public User User { get; set; } = null!;

    public PostReactionType ReactionType { get; set; } = PostReactionType.Like;
}
