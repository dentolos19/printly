using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public class Product : BaseEntity
{
    [Required]
    [StringLength(255, MinimumLength = 1)]
    public required string Name { get; set; }

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Base price must be greater than 0")]
    public decimal BasePrice { get; set; }

    public bool IsActive { get; set; } = true;

    // Product image (generic image for the product)
    public Guid? ImageId { get; set; }
    public Asset? Image { get; set; }

    // 3D Model file (.glb)
    public Guid? ModelId { get; set; }
    public Asset? Model { get; set; }

    // Navigation property
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}
