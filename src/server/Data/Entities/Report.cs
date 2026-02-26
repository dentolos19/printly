namespace PrintlyServer.Data.Entities;

public enum ReportType
{
    Post = 0,
    Comment = 1,
    User = 2,
}

public enum ReportStatus
{
    Pending = 0,
    Reviewed = 1,
    Resolved = 2,
    Dismissed = 3,
}

public enum ReportReason
{
    Spam = 0,
    Harassment = 1,
    HateSpeech = 2,
    Violence = 3,
    Nudity = 4,
    FalseInformation = 5,
    Copyright = 6,
    Other = 7,
}

public class Report : BaseEntity
{
    public required string ReporterId { get; set; }

    public User Reporter { get; set; } = null!;

    public required ReportType ReportType { get; set; }

    // Target IDs - only one will be set based on ReportType
    public Guid? PostId { get; set; }
    public Guid? CommentId { get; set; }
    public string? ReportedUserId { get; set; }

    public Post? Post { get; set; }

    public PostComment? ReportedComment { get; set; }

    public User? ReportedUser { get; set; }

    public required ReportReason Reason { get; set; }

    public string? Description { get; set; }

    public ReportStatus Status { get; set; } = ReportStatus.Pending;

    public string? AdminNotes { get; set; }

    public string? ReviewedById { get; set; }

    public User? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }
}
