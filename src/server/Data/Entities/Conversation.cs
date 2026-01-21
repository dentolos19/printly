using PrintlyServer.Data;

namespace PrintlyServer.Data.Entities;

public class Conversation : BaseEntity
{
    public string? Subject { get; set; }

    public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();

    public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
}
