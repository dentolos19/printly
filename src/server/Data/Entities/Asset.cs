namespace PrintlyServer.Data.Entities;

public class Asset : BaseEntity
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Type { get; set; }
    public required string Hash { get; set; }
    public required long Size { get; set; }
    public bool IsGenerated { get; set; }
    public bool IsDeleted { get; set; }

    // Foreign Keys

    public string? UserId { get; set; }
    public User? User { get; set; }
}
