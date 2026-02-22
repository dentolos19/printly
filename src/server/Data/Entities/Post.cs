namespace PrintlyServer.Data.Entities;

public enum PostVisibility
{
    Visible,
    Deleted
}

public enum PostStatus
{
    Published,
    Draft,
    Archived
}

public enum PostReactionType
{
    Like,
    Love,
    Wow
}

public class Post : BaseEntity
{
    public string AuthorId { get; set; } = null!;
    public User Author { get; set; } = null!;

    public string Caption { get; set; }

    public Guid PhotoId { get; set; }
    public Asset Photo { get; set; }

    public PostVisibility Visibility { get; set; } = PostVisibility.Visible;
    public PostStatus PostStatus { get; set; } = PostStatus.Draft;

    // Pinned post support
    public bool IsPinned { get; set; } = false;
    public DateTime? PinnedAt { get; set; }

    // Content moderation
    public bool IsNsfw { get; set; } = false;
    public string? ContentWarning { get; set; }

    public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
    public ICollection<PostReaction> Reactions { get; set; } = new List<PostReaction>();
    public ICollection<PostBookmark> Bookmarks { get; set; } = new List<PostBookmark>();
    public ICollection<PostTag> Tags { get; set; } = new List<PostTag>();
    public ICollection<PostShare> Shares { get; set; } = new List<PostShare>();
    public ICollection<PostView> Views { get; set; } = new List<PostView>();
}
