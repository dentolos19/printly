using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public class Design : BaseEntity
{
    public required string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    [Column(TypeName = "jsonb")]
    public string Data { get; set; } = string.Empty;

    // Foreign Keys

    public required string UserId { get; set; }
    public User User { get; set; } = null!;
}
