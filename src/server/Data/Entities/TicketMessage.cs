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

    // LiveKit fields (for future implementation)
    public string? VoiceMessageUrl { get; set; }
    public int? VoiceMessageDuration { get; set; }
    public string? CallId { get; set; }
    public string? CallParticipants { get; set; }
    public int? CallDuration { get; set; }
    public bool? CallMissed { get; set; }
}
