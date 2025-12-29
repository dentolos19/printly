namespace PrintlyServer.Data.Entities;

/// <summary>
/// Represents a customer support conversation
/// </summary>
public class Ticket : BaseEntity
{
    public required string CustomerId { get; set; }
    public User Customer { get; set; } = null!;

    public required string Subject { get; set; }
    public required TicketStatus Status { get; set; } = TicketStatus.Pending;
    public TicketPriority Priority { get; set; } = TicketPriority.Normal;

    // Link to order (when Order entity exists)
    public Guid? OrderId { get; set; }

    public DateTime LastMessageAt { get; set; }
    public int UnreadCount { get; set; } = 0;

    // One ticket has many messages
    public ICollection<TicketMessage> Messages { get; set; } = new List<TicketMessage>();
}

public enum TicketStatus
{
    Pending = 0,    // New ticket, waiting for admin response
    Active = 1,     // Admin is working on it
    Resolved = 2,   // Issue fixed, waiting for customer confirmation
    Closed = 3      // Ticket closed and archived
}

public enum TicketPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3
}
