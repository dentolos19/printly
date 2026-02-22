namespace PrintlyServer.Data.Entities;

public class NotificationPreference : BaseEntity
{
    public string UserId { get; set; } = null!;
    public User User { get; set; } = null!;

    public NotificationType Type { get; set; }

    public bool InAppEnabled { get; set; } = true;
    public bool PushEnabled { get; set; } = true;
}
