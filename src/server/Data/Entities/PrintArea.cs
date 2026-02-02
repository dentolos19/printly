using System.ComponentModel.DataAnnotations;

namespace PrintlyServer.Data.Entities;

public class PrintArea : BaseEntity
{
    [Required]
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public required string AreaId { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }

    [StringLength(100)]
    public string? MeshName { get; set; }

    public float RayDirectionX { get; set; }
    public float RayDirectionY { get; set; }
    public float RayDirectionZ { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsAutoDetected { get; set; }
}
