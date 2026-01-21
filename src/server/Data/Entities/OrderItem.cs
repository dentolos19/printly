using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public class OrderItem : BaseEntity
{
    // Foreign Key to Order
    [Required]
    public Guid OrderId { get; set; }

    // Foreign Key to ProductVariant
    [Required]
    public Guid VariantId { get; set; }

    // Foreign Key to DesignRequest - nullable - not all orders need design requests
    public Guid? RequestId { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
    public int Quantity { get; set; }

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Unit price must be greater than 0")]
    public decimal UnitPrice { get; set; }

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Subtotal must be greater than 0")]
    public decimal Subtotal { get; set; }

    // Navigation properties
    public Order Order { get; set; } = null!;
    public ProductVariant Variant { get; set; } = null!;
    // TODO: Add DesignRequest navigation property when that entity is created
    // public DesignRequest? Request { get; set; }
}
