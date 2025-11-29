namespace MocklyServer.Models;

public class Asset : BaseEntity
{
    public required string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string BucketReference { get; set; } = string.Empty;
    public bool IsGenerated { get; set; } = false;

    // Foreign Keys
    public string? UserId { get; set; }
    public User? User { get; set; }
}