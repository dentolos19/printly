using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public enum RefundStatus
{
    Requested,
    UnderReview,
    Approved,
    Rejected,
    Processing,
    Completed,
    Failed,
}

public enum RefundReason
{
    // Pre-shipping reasons (available for Paid, Processing)
    ChangedMind,
    OrderedByMistake,
    FoundBetterPrice,
    TooLongToProcess,

    // Post-shipping reasons (available for Shipped, Delivered)
    DamagedInShipping,
    WrongItemReceived,
    ItemNotAsDescribed,
    DefectiveProduct,
    WrongSize,
    QualityNotAsExpected,
    NeverReceived,

    // Always available
    Other,
}

public class Refund : BaseEntity
{
    // Foreign Key to Payment
    [Required]
    public Guid PaymentId { get; set; }

    // Foreign Key to Order
    [Required]
    public Guid OrderId { get; set; }

    // User who requested the refund
    [Required]
    public required string RequestedByUserId { get; set; }

    // Admin who processed the refund (nullable until processed)
    public string? ProcessedByUserId { get; set; }

    // Requested refund amount
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    [Range(0, double.MaxValue, ErrorMessage = "Requested amount cannot be negative")]
    public decimal RequestedAmount { get; set; }

    // Approved amount (can be different from requested, nullable until approved)
    [Column(TypeName = "decimal(10,2)")]
    public decimal? ApprovedAmount { get; set; }

    // Reason for refund
    [Required]
    public RefundReason Reason { get; set; }

    // Customer's explanation
    [MaxLength(1000)]
    public string? CustomerNotes { get; set; }

    // Admin's internal notes
    [MaxLength(1000)]
    public string? AdminNotes { get; set; }

    // Refund status
    [Required]
    public RefundStatus Status { get; set; } = RefundStatus.Requested;

    // Timestamps
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }

    // Stripe refund ID (once processed)
    [MaxLength(255)]
    public string? StripeRefundId { get; set; }

    // Link to conversation/chat ticket (optional)
    public Guid? ConversationId { get; set; }

    // Navigation properties
    public Payment Payment { get; set; } = null!;
    public Order Order { get; set; } = null!;
    public User RequestedByUser { get; set; } = null!;
    public User? ProcessedByUser { get; set; }
    public Conversation? Conversation { get; set; }
}
