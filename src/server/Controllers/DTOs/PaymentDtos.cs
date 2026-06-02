using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers.Dtos;

// Payment DTOs

public enum PaymentStatusDto
{
    Pending = 0,
    Paid = 1,
    Failed = 2,
    Refunded = 3,
    Cancelled = 4,
}

public record PaymentResponse(
    Guid Id,
    Guid OrderId,
    decimal Amount,
    string Currency,
    PaymentStatusDto Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateCheckoutRequest(Guid OrderId);

public record CheckoutResponse(string CheckoutUrl);

public record PaymentSummaryResponse(
    Guid Id,
    Guid OrderId,
    decimal Amount,
    string Currency,
    PaymentStatusDto Status,
    DateTime CreatedAt
);
