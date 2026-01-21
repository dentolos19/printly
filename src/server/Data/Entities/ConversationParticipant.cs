using PrintlyServer.Data;

namespace PrintlyServer.Data.Entities;

public class ConversationParticipant : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public required string UserId { get; set; }
    public User User { get; set; } = null!;

    public ConversationParticipantRole Role { get; set; } = ConversationParticipantRole.Member;
}

public enum ConversationParticipantRole
{
    Member = 0,
    Admin = 1,
}
