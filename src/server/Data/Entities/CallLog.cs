using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public class CallLog : BaseEntity
{
    public Guid ConversationId { get; set; }

    [ForeignKey(nameof(ConversationId))]
    public Conversation Conversation { get; set; } = null!;

    public required string InitiatorId { get; set; }

    [ForeignKey(nameof(InitiatorId))]
    public User Initiator { get; set; } = null!;

    public CallType Type { get; set; }
    public CallStatus Status { get; set; } = CallStatus.Ringing;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
    public int? DurationSeconds { get; set; }
    public string? LiveKitRoomName { get; set; }

    // AI Call Notes fields
    public Guid? RecordingAssetId { get; set; }

    [ForeignKey(nameof(RecordingAssetId))]
    public Asset? RecordingAsset { get; set; }

    public string? Transcript { get; set; }
    public string? AiCallNotes { get; set; }

    public ICollection<CallParticipant> Participants { get; set; } = new List<CallParticipant>();
}

public class CallParticipant : BaseEntity
{
    public Guid CallLogId { get; set; }

    [ForeignKey(nameof(CallLogId))]
    public CallLog CallLog { get; set; } = null!;

    public required string UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
    public bool DidAnswer { get; set; } = false;
}

public enum CallType
{
    Audio = 0,
    Video = 1,
}

public enum CallStatus
{
    Ringing = 0,
    Ongoing = 1,
    Completed = 2,
    Missed = 3,
    Declined = 4,
    Failed = 5,
}
