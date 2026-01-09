namespace PrintlyServer.Data.Entities;

public enum PostVisibility
{
    Visible,
    Deleted
}

public enum Status
{
    Published,
    Draft,
    Archived
}

public enum ReactionType
{
    Like,
    Love,
    Wow
}

public class Post : BaseEntity
{
    public Guid AuthorId { get; set; }
    public User Author { get; set; }

    public string Caption { get; set; }

    public Guid PhotoId { get; set; }

    public PostVisibility Visibility { get; set; } = PostVisibility.Visible;
    public Status Status { get; set; } = Status.Draft;

    // public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
    // public ICollection<PostReaction> Reactions { get; set; } = new List<PostReaction>();
    // public ICollection<PostBookmark> Bookmarks { get; set; } = new List<PostBookmark>();
}
