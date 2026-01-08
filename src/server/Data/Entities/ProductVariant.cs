using System.ComponentModel.DataAnnotations;

namespace PrintlyServer.Data.Entities;

public enum ProductSize
{
    S,
    M,
    L,
}

public enum ProductColor
{
    Red,
    Blue,
    Green,
    Black,
}

public class ProductVariant : BaseEntity
{
    // Foreign Key
    [Required]
    public Guid ProductId { get; set; }

    [Required]
    public ProductSize Size { get; set; }

    [Required]
    public ProductColor Color { get; set; }

    // Navigation properties
    public Product Product { get; set; } = null!;
    public Inventory Inventory { get; set; } = null!;
}
