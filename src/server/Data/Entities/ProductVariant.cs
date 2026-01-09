using System.ComponentModel.DataAnnotations;

namespace PrintlyServer.Data.Entities;

public enum ProductSize
{
    S,
    M,
    L,
}

public class ProductVariant : BaseEntity
{
    // Foreign Key
    [Required]
    public Guid ProductId { get; set; }

    [Required]
    public ProductSize Size { get; set; }

    [Required]
    [StringLength(50)]
    public string Color { get; set; } = "Black";

    // Optional image for the variant
    public Guid? ImageId { get; set; }

    // Navigation properties
    public Product Product { get; set; } = null!;
    public Inventory Inventory { get; set; } = null!;
    public Asset? Image { get; set; }
}
