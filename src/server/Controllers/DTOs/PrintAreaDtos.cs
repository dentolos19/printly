using System.ComponentModel.DataAnnotations;

namespace PrintlyServer.Controllers.Dtos;

public record PrintAreaResponse(
    Guid Id,
    Guid ProductId,
    string AreaId,
    string Name,
    string? MeshName,
    float[] RayDirection,
    int DisplayOrder,
    bool IsAutoDetected,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePrintAreaDto(
    [Required] Guid ProductId,
    [Required] [StringLength(50, MinimumLength = 1)] string AreaId,
    [Required] [StringLength(100, MinimumLength = 1)] string Name,
    [StringLength(100)] string? MeshName,
    float[]? RayDirection,
    int? DisplayOrder
);

public record UpdatePrintAreaDto(
    [StringLength(50, MinimumLength = 1)] string? AreaId,
    [StringLength(100, MinimumLength = 1)] string? Name,
    [StringLength(100)] string? MeshName,
    float[]? RayDirection,
    int? DisplayOrder
);

public record BulkCreatePrintAreasDto([Required] Guid ProductId, [Required] List<CreatePrintAreaItemDto> PrintAreas);

public record CreatePrintAreaItemDto(
    [Required] [StringLength(50, MinimumLength = 1)] string AreaId,
    [Required] [StringLength(100, MinimumLength = 1)] string Name,
    [StringLength(100)] string? MeshName,
    float[]? RayDirection,
    int? DisplayOrder,
    bool IsAutoDetected = false
);
