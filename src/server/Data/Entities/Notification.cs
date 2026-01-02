namespace PrintlyServer.Data.Entities;

public class Notification : BaseEntity
{
    public required string UserId { get; set; }
    public User User { get; set; } = null!;

    // Notification type and content
    public required NotificationType Type { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }

    // Related entities
    public Guid? TicketId { get; set; }
    public Ticket? Ticket { get; set; }

    public Guid? MessageId { get; set; }

    // Status tracking
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }

    public bool IsArchived { get; set; } = false;
    public DateTime? ArchivedAt { get; set; }

    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

    // Priority for sorting and display
    public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;

    // Action URL (where to go when clicked)
    public string? ActionUrl { get; set; }
}

public enum NotificationType
{
    TicketCreated = 0, // New ticket created
    TicketAssigned = 1, // Ticket assigned to admin
    TicketStatusChanged = 2, // Status updated
    TicketPriorityChanged = 3, // Priority changed
    NewMessage = 4, // New message in ticket
    TicketClosed = 5, // Ticket closed
    MentionedInMessage = 6, // @mentioned in message
    AdminJoinedTicket = 7, // Another admin joined
    BroadcastSent = 8, // System broadcast
}

public enum NotificationPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3,
}
