using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public class Imprint : BaseEntity
{
    public required string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    [Column(TypeName = "jsonb")]
    public string Data { get; set; } = string.Empty;

    // Customization pricing (constant for now, can be dynamic later)
    [Column(TypeName = "decimal(10,2)")]
    [Range(0, double.MaxValue, ErrorMessage = "Customization price cannot be negative")]
    public decimal CustomizationPrice { get; set; } = 5.00m;

    // Foreign Keys

    public required string UserId { get; set; }
    public User User { get; set; } = null!;

    // Optional: Link imprint to a specific product
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
}
