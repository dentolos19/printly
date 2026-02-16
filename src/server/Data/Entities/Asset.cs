namespace PrintlyServer.Data.Entities;

public static class AssetCategory
{
    public const string User = "user";
    public const string Generated = "generated";
    public const string Cover = "cover";
}

public class Asset : BaseEntity
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Type { get; set; }
    public required string Hash { get; set; }
    public required long Size { get; set; }
    public string Category { get; set; } = AssetCategory.User;
    public bool IsGenerated { get; set; }
    public bool IsDeleted { get; set; }

    // Inline thumbnail for fast preview loading without hitting object storage.
    // Should be kept small (max ~100KB). Null if not applicable (e.g. 3D models).
    public byte[]? ThumbnailData { get; set; }
    public string? ThumbnailType { get; set; }

    // Foreign Keys

    public string? UserId { get; set; }
    public User? User { get; set; }
}
