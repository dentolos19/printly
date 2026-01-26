using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Hubs;

namespace PrintlyServer.Services;

public interface INotificationService
{
    Task CreateNotificationAsync(
        string userId,
        NotificationType type,
        string title,
        string message,
        Guid? conversationId = null,
        Guid? messageId = null,
        NotificationPriority priority = NotificationPriority.Normal,
        string? actionUrl = null
    );

    Task NotifyAdminsAsync(
        NotificationType type,
        string title,
        string message,
        Guid? conversationId = null,
        NotificationPriority priority = NotificationPriority.Normal
    );

    Task NotifyStatusChangeAsync(
        Guid conversationId,
        string customerId,
        ConversationStatus newStatus,
        string adminName
    );

    Task NotifyPriorityChangeAsync(
        Guid conversationId,
        string customerId,
        ConversationPriority newPriority,
        string adminName
    );

    Task NotifyNewMessageAsync(
        Guid conversationId,
        string recipientId,
        string senderName,
        string messagePreview,
        Guid messageId
    );
}

public class NotificationService(
    DatabaseContext context,
    IHubContext<ConversationHub> conversationHubContext,
    ILogger<NotificationService> logger
) : INotificationService
{
    private readonly DatabaseContext _context = context;
    private readonly IHubContext<ConversationHub> _conversationHubContext = conversationHubContext;
    private readonly ILogger<NotificationService> _logger = logger;

    public async Task CreateNotificationAsync(
        string userId,
        NotificationType type,
        string title,
        string message,
        Guid? conversationId = null,
        Guid? messageId = null,
        NotificationPriority priority = NotificationPriority.Normal,
        string? actionUrl = null
    )
    {
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ConversationId = conversationId,
            MessageId = messageId,
            Priority = priority,
            ActionUrl = actionUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();

        await _conversationHubContext
            .Clients.User(userId)
            .SendAsync(
                "ReceiveNotification",
                new
                {
                    id = notification.Id,
                    type = notification.Type.ToString(),
                    title = notification.Title,
                    message = notification.Message,
                    conversationId = notification.ConversationId,
                    priority = notification.Priority.ToString(),
                    actionUrl = notification.ActionUrl,
                    createdAt = notification.CreatedAt,
                }
            );

        _logger.LogInformation("Notification created for user {UserId}: {Type}", userId, type);
    }

    public async Task NotifyAdminsAsync(
        NotificationType type,
        string title,
        string message,
        Guid? conversationId = null,
        NotificationPriority priority = NotificationPriority.Normal
    )
    {
        var adminRoleId = await _context.Roles.Where(r => r.Name == "Admin").Select(r => r.Id).FirstOrDefaultAsync();

        if (adminRoleId == null)
        {
            _logger.LogWarning("Admin role not found");
            return;
        }

        var adminUserIds = await _context
            .UserRoles.Where(ur => ur.RoleId == adminRoleId)
            .Select(ur => ur.UserId)
            .ToListAsync();

        foreach (var adminId in adminUserIds)
        {
            await CreateNotificationAsync(
                adminId,
                type,
                title,
                message,
                conversationId,
                null,
                priority,
                conversationId.HasValue ? $"/chat?conversation={conversationId}" : null
            );
        }
    }

    public async Task NotifyStatusChangeAsync(
        Guid conversationId,
        string customerId,
        ConversationStatus newStatus,
        string adminName
    )
    {
        var title = newStatus switch
        {
            ConversationStatus.Active => "Conversation Active",
            ConversationStatus.Resolved => "Conversation Resolved",
            ConversationStatus.Closed => "Conversation Closed",
            _ => "Conversation Status Updated",
        };

        var message = $"{adminName} changed your conversation status to {newStatus}";

        await CreateNotificationAsync(
            customerId,
            NotificationType.ConversationStatusChanged,
            title,
            message,
            conversationId,
            null,
            NotificationPriority.Normal,
            $"/chat?conversation={conversationId}"
        );
    }

    public async Task NotifyPriorityChangeAsync(
        Guid conversationId,
        string customerId,
        ConversationPriority newPriority,
        string adminName
    )
    {
        var isEscalation = newPriority >= ConversationPriority.High;

        var title = isEscalation ? "Conversation Escalated" : "Conversation Priority Changed";
        var message = $"{adminName} set your conversation priority to {newPriority}";

        var notificationPriority =
            newPriority == ConversationPriority.Urgent ? NotificationPriority.High : NotificationPriority.Normal;

        await CreateNotificationAsync(
            customerId,
            NotificationType.ConversationPriorityChanged,
            title,
            message,
            conversationId,
            null,
            notificationPriority,
            $"/chat?conversation={conversationId}"
        );
    }

    public async Task NotifyNewMessageAsync(
        Guid conversationId,
        string recipientId,
        string senderName,
        string messagePreview,
        Guid messageId
    )
    {
        var title = "New Message";
        var message = $"{senderName}: {messagePreview}";

        await CreateNotificationAsync(
            recipientId,
            NotificationType.NewMessage,
            title,
            message,
            conversationId,
            messageId,
            NotificationPriority.Normal,
            $"/chat?conversation={conversationId}"
        );
    }
}
