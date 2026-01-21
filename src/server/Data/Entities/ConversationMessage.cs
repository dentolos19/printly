using System.ComponentModel.DataAnnotations.Schema;
using PrintlyServer.Data;

namespace PrintlyServer.Data.Entities;

public class ConversationMessage : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public Guid ParticipantId { get; set; }
    public ConversationParticipant Participant { get; set; } = null!;

    public required string Content { get; set; }

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }

    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Guid? ReplyToMessageId { get; set; }

    [ForeignKey(nameof(ReplyToMessageId))]
    public ConversationMessage? ReplyToMessage { get; set; }
}
