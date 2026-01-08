using System.ComponentModel.DataAnnotations;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers.Dtos;

public record ProductResponse(
    Guid Id,
    string Name,
    decimal BasePrice,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<ProductVariantResponse> Variants
);

public record ProductSummaryResponse(
    Guid Id,
    string Name,
    decimal BasePrice,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int VariantCount,
    int TotalStock
);

public record CreateProductDto(
    [Required] [StringLength(255, MinimumLength = 1)] string Name,
    [Required] [Range(0.01, double.MaxValue)] decimal BasePrice,
    bool IsActive = true
);

public record UpdateProductDto(
    [StringLength(255, MinimumLength = 1)] string? Name,
    [Range(0.01, double.MaxValue)] decimal? BasePrice,
    bool? IsActive
);

public record ProductVariantResponse(
    Guid Id,
    Guid ProductId,
    ProductSize Size,
    ProductColor Color,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    InventoryResponse? Inventory
);

public record ProductVariantWithProductResponse(
    Guid Id,
    Guid ProductId,
    string ProductName,
    ProductSize Size,
    ProductColor Color,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    InventoryResponse? Inventory
);

public record CreateProductVariantDto(
    [Required] Guid ProductId,
    [Required] ProductSize Size,
    [Required] ProductColor Color
);

public record UpdateProductVariantDto(ProductSize? Size, ProductColor? Color);

public record InventoryResponse(
    Guid Id,
    Guid VariantId,
    int Quantity,
    int ReorderLevel,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record InventoryWithVariantResponse(
    Guid Id,
    Guid VariantId,
    Guid ProductId,
    string ProductName,
    ProductSize Size,
    ProductColor Color,
    int Quantity,
    int ReorderLevel,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateInventoryDto(
    [Required] Guid VariantId,
    [Required] [Range(0, int.MaxValue)] int Quantity,
    [Required] [Range(0, int.MaxValue)] int ReorderLevel
);

public record UpdateInventoryDto([Range(0, int.MaxValue)] int? Quantity, [Range(0, int.MaxValue)] int? ReorderLevel);

/// <summary>
/// DTO for creating a product with its variants in one request
/// </summary>
public record CreateProductWithVariantsDto(
    [Required] [StringLength(255, MinimumLength = 1)] string Name,
    [Required] [Range(0.01, double.MaxValue)] decimal BasePrice,
    bool IsActive = true,
    List<CreateVariantForProductDto>? Variants = null
);

public record CreateVariantForProductDto(
    [Required] ProductSize Size,
    [Required] ProductColor Color,
    int InitialQuantity = 0,
    int ReorderLevel = 10
);

/// <summary>
/// DTO for low stock alerts
/// </summary>
public record LowStockAlertResponse(
    Guid InventoryId,
    Guid VariantId,
    Guid ProductId,
    string ProductName,
    ProductSize Size,
    ProductColor Color,
    int Quantity,
    int ReorderLevel
);
