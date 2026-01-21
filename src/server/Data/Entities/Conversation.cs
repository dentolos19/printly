using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

/// <summary>
/// Represents a support conversation between a customer and admins.
/// When a customer creates a conversation, all admins are automatically added.
/// </summary>
public class Conversation : BaseEntity
{
    public string? Subject { get; set; }

    // The customer who created this conversation
    public required string CustomerId { get; set; }

    [ForeignKey(nameof(CustomerId))]
    public User Customer { get; set; } = null!;

    // Optional link to an order this conversation is about
    public Guid? OrderId { get; set; }

    // Status tracking for support workflow
    public ConversationStatus Status { get; set; } = ConversationStatus.Pending;

    // Priority for support triage
    public ConversationPriority Priority { get; set; } = ConversationPriority.Normal;

    // When the last message was sent, useful for sorting
    public DateTime? LastMessageAt { get; set; }

    // Number of unread messages for quick badge display
    public int UnreadCount { get; set; } = 0;

    public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();

    public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
}

public enum ConversationStatus
{
    Pending = 0, // New conversation, waiting for admin response
    Active = 1, // Admin is working on it
    Resolved = 2, // Issue fixed, waiting for customer confirmation
    Closed = 3, // Conversation closed and archived
}

public enum ConversationPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3,
}
