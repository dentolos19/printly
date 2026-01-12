namespace PrintlyServer.Data.Entities;

public class PostComment : BaseEntity
{
    public Guid PostId { get; set; }
    public Post Post { get; set; }

    public string AuthorId { get; set; } = null!;
    public User Author { get; set; } = null!;

    public Guid? ParentId { get; set; } // parent => only in play if the comment is a reply to another comment
    public PostComment? Parent { get; set; }

    public ICollection<PostComment> Replies { get; set; }

    public string Content { get; set; } = string.Empty;
    public PostStatus PostStatus { get; set; } = PostStatus.Published;
}
