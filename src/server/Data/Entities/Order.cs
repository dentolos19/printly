using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public enum OrderStatus
{
    PendingPayment,
    Paid,
    Processing,
    Shipped,
    Delivered,
    Cancelled,

    // Refund-related statuses
    RefundRequested,
    RefundApproved,
    Refunded,
}

public class Order : BaseEntity
{
    // Foreign Key to User
    [Required]
    public required string UserId { get; set; }

    [Required]
    public OrderStatus Status { get; set; } = OrderStatus.PendingPayment;

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    [Range(0, double.MaxValue, ErrorMessage = "Total amount cannot be negative")]
    public decimal TotalAmount { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
