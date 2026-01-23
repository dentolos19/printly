using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public enum PaymentStatus
{
    Pending,
    Paid,
    Failed,
    Refunded,
    Cancelled,
}

public class Payment : BaseEntity
{
    // Foreign Key to Order (1:1 relationship)
    [Required]
    public Guid OrderId { get; set; }

    // Stripe Checkout Session ID
    [MaxLength(255)]
    public string? StripeCheckoutSessionId { get; set; }

    // Snapshot of the amount at time of payment
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    [Range(0, double.MaxValue, ErrorMessage = "Amount cannot be negative")]
    public decimal Amount { get; set; }

    // Currency code (e.g., "sgd", "usd")
    [Required]
    [MaxLength(10)]
    public required string Currency { get; set; } = "sgd";

    // Payment status
    [Required]
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    // Navigation property
    public Order Order { get; set; } = null!;
}
