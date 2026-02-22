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
    public Guid? ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

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
    ConversationCreated = 0,
    ConversationAssigned = 1,
    ConversationStatusChanged = 2,
    ConversationPriorityChanged = 3,
    NewMessage = 4,
    ConversationClosed = 5,
    MentionedInMessage = 6,
    AdminJoinedConversation = 7,
    BroadcastSent = 8,

    // Refund notifications
    RefundRequested = 9,
    RefundApproved = 10,
    RefundRejected = 11,
    RefundCompleted = 12,

    // Community/Social notifications
    NewFollower = 20,
    PostLiked = 21,
    PostCommented = 22,
    CommentReplied = 23,
    Mentioned = 24,
    FollowRequested = 25,
    FollowRequestApproved = 26,
    CommentReacted = 27,
    PostShared = 28,
}

public enum NotificationPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3,
}
