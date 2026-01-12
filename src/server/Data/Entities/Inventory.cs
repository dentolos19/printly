using System.ComponentModel.DataAnnotations;

namespace PrintlyServer.Data.Entities;

public class Inventory : BaseEntity
{
    // Foreign Key
    [Required]
    public Guid VariantId { get; set; }

    [Required]
    [Range(0, int.MaxValue, ErrorMessage = "Quantity cannot be negative")]
    public int Quantity { get; set; }

    [Required]
    [Range(0, int.MaxValue, ErrorMessage = "Reorder level cannot be negative")]
    public int ReorderLevel { get; set; }

    // Navigation property
    public ProductVariant Variant { get; set; } = null!;
}
