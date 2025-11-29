namespace MocklyServer.Models;

public class Design : BaseEntity
{
    public required string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Data { get; set; } = string.Empty;

    // Foreign Key
    public required string UserId { get; set; }
    public User User { get; set; } = null!;
}