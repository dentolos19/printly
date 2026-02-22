namespace PrintlyServer.Data.Entities;

public class Tag : BaseEntity
{
    public string Name { get; set; } = null!;

    public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
}

public class PostTag
{
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
