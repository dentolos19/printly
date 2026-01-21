using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

/// <summary>
/// Individual message within a support ticket
/// </summary>
public class TicketMessage : BaseEntity
{
    public required Guid TicketId { get; set; }
    public Ticket Ticket { get; set; } = null!;

    public required string SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public required string Content { get; set; }

    // Track read status separately for customer and admins
    public bool IsReadByCustomer { get; set; } = false;
    public bool IsReadByAdmin { get; set; } = false;

    // Edit tracking - shows when a message has been modified
    public bool IsEdited { get; set; } = false;
    public DateTime? EditedAt { get; set; }

    // Soft delete tracking - deleted messages show "This message was deleted"
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

    // Reply/Quote functionality
    public Guid? ReplyToMessageId { get; set; }

    [ForeignKey(nameof(ReplyToMessageId))]
    public TicketMessage? ReplyToMessage { get; set; }

    // LiveKit fields (for future implementation)
    public string? VoiceMessageUrl { get; set; }
    public int? VoiceMessageDuration { get; set; }
    public string? CallId { get; set; }
    public string? CallParticipants { get; set; }
    public int? CallDuration { get; set; }
    public bool? CallMissed { get; set; }
}
