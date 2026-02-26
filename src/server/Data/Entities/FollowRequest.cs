namespace PrintlyServer.Data.Entities;

public enum FollowRequestStatus
{
    Pending,
    Approved,
    Rejected,
}

public class FollowRequest : BaseEntity
{
    public string RequesterId { get; set; } = null!;
    public User Requester { get; set; } = null!;

    public string TargetId { get; set; } = null!;
    public User Target { get; set; } = null!;

    public FollowRequestStatus Status { get; set; } = FollowRequestStatus.Pending;
}
