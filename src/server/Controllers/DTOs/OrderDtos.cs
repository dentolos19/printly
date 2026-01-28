using System.ComponentModel.DataAnnotations;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers.Dtos;

public record OrderResponse(
    Guid Id,
    string UserId,
    string UserEmail,
    OrderStatus Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<OrderItemResponse> Items
);

public record OrderSummaryResponse(
    Guid Id,
    string UserId,
    string UserEmail,
    OrderStatus Status,
    decimal TotalAmount,
    int ItemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record OrderItemResponse(
    Guid Id,
    Guid OrderId,
    Guid VariantId,
    Guid? RequestId,
    Guid? ImprintId,
    string? ImprintName,
    string ProductName,
    string? ProductImageUrl,
    ProductSize Size,
    string Color,
    int Quantity,
    decimal UnitPrice,
    decimal CustomizationPrice,
    decimal Subtotal,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

/// <summary>
/// DTO for creating an order with items
/// </summary>
public record CreateOrderDto(
    [Required] [MinLength(1, ErrorMessage = "Order must have at least one item")] List<CreateOrderItemDto> Items
);

/// <summary>
/// DTO for creating an order item
/// </summary>
public record CreateOrderItemDto(
    [Required] Guid VariantId,
    Guid? RequestId,
    Guid? ImprintId,
    [Required] [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")] int Quantity
);

/// <summary>
/// DTO for admin to update order status
/// </summary>
public record UpdateOrderStatusDto([Required] OrderStatus Status);

/// <summary>
/// DTO for admin to update order details
/// </summary>
public record AdminUpdateOrderDto(OrderStatus? Status, decimal? TotalAmount);

/// <summary>
/// DTO for adding items to an existing order (admin only)
/// </summary>
public record AddOrderItemDto(
    [Required] Guid VariantId,
    Guid? RequestId,
    Guid? ImprintId,
    [Required] [Range(1, int.MaxValue)] int Quantity,
    [Required] [Range(0.01, double.MaxValue)] decimal UnitPrice,
    [Range(0, double.MaxValue)] decimal CustomizationPrice = 0
);

/// <summary>
/// DTO for updating an order item (admin only)
/// </summary>
public record UpdateOrderItemDto(
    [Range(1, int.MaxValue)] int? Quantity,
    [Range(0.01, double.MaxValue)] decimal? UnitPrice,
    Guid? RequestId,
    Guid? ImprintId
);

/// <summary>
/// DTO for user order statistics
/// </summary>
public record UserOrderStatsResponse(int ActiveOrders, int PendingPayment, int CompletedOrders, decimal TotalSpent);

/// <summary>
/// DTO for admin order statistics
/// </summary>
public record AdminOrderStatsResponse(
    int TotalOrders,
    decimal TotalRevenue,
    int PendingOrders,
    int ProcessingOrders,
    int ShippedOrders,
    int CompletedOrders,
    int CancelledOrders,
    List<MonthlyRevenueData> MonthlyRevenue,
    List<OrderStatusData> StatusDistribution
);

public record MonthlyRevenueData(string Month, decimal Revenue, int OrderCount);

public record OrderStatusData(string Status, int Count);
