using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers.Dtos;

// Refund DTOs

public enum RefundStatusDto
{
    Requested = 0,
    UnderReview = 1,
    Approved = 2,
    Rejected = 3,
    Processing = 4,
    Completed = 5,
    Failed = 6,
}

public enum RefundReasonDto
{
    DefectiveProduct = 0,
    WrongSize = 1,
    WrongItem = 2,
    NotAsDescribed = 3,
    DamagedInShipping = 4,
    DidNotMeetExpectations = 5,
    Other = 6,
}

// Request DTOs
public record CreateRefundRequest(Guid OrderId, decimal RequestedAmount, RefundReasonDto Reason, string? CustomerNotes);

public record ApproveRefundRequest(decimal? ApprovedAmount, string? AdminNotes);

public record RejectRefundRequest(string? AdminNotes);

// Response DTOs
public record RefundResponse(
    Guid Id,
    Guid PaymentId,
    Guid OrderId,
    string RequestedByUserId,
    string RequestedByUserName,
    string? ProcessedByUserId,
    string? ProcessedByUserName,
    decimal RequestedAmount,
    decimal? ApprovedAmount,
    RefundReasonDto Reason,
    string? CustomerNotes,
    string? AdminNotes,
    RefundStatusDto Status,
    DateTime RequestedAt,
    DateTime? ProcessedAt,
    string? StripeRefundId,
    Guid? ConversationId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record RefundSummaryResponse(
    Guid Id,
    Guid OrderId,
    decimal RequestedAmount,
    decimal? ApprovedAmount,
    RefundReasonDto Reason,
    RefundStatusDto Status,
    DateTime RequestedAt,
    DateTime? ProcessedAt
);

public record RefundWithOrderResponse(
    Guid Id,
    Guid PaymentId,
    Guid OrderId,
    string RequestedByUserId,
    string RequestedByUserName,
    string? ProcessedByUserId,
    string? ProcessedByUserName,
    decimal RequestedAmount,
    decimal? ApprovedAmount,
    RefundReasonDto Reason,
    string? CustomerNotes,
    string? AdminNotes,
    RefundStatusDto Status,
    DateTime RequestedAt,
    DateTime? ProcessedAt,
    string? StripeRefundId,
    Guid? ConversationId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // Order info
    decimal OrderTotalAmount,
    OrderStatus OrderStatus,
    int OrderItemCount
);
