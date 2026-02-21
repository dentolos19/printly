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
    ILogger<NotificationService> logger,
    IEmailService emailService
) : INotificationService
{
    private readonly DatabaseContext _context = context;
    private readonly IHubContext<ConversationHub> _conversationHubContext = conversationHubContext;
    private readonly ILogger<NotificationService> _logger = logger;
    private readonly IEmailService _emailService = emailService;

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
        _logger.LogWarning(
            "[NOTIFICATION DEBUG] CreateNotificationAsync called. UserId: {UserId}, Type: {Type}, Title: {Title}",
            userId,
            type,
            title
        );

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

        _logger.LogWarning(
            "[NOTIFICATION DEBUG] Notification saved to DB with ID: {NotificationId}, UserId: {UserId}",
            notification.Id,
            notification.UserId
        );

        // Send via SignalR
        try
        {
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
                        messageId = notification.MessageId,
                        priority = notification.Priority.ToString(),
                        actionUrl = notification.ActionUrl,
                        isRead = false,
                        createdAt = notification.CreatedAt,
                    }
                );

            _logger.LogInformation(
                "[NotificationService] SignalR notification sent successfully to UserId: {UserId}",
                userId
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "[NotificationService] Failed to send SignalR notification to UserId: {UserId}",
                userId
            );
        }

        // Check if we should send a digest email
        // Only fires when unread count hits exactly the threshold (10)
        // and we haven't already sent an email for this batch
        try
        {
            const int emailThreshold = 10;
            var unreadCount = await _context.Notifications.CountAsync(n =>
                n.UserId == userId && !n.IsRead && !n.IsDeleted && !n.IsArchived
            );

            if (unreadCount >= emailThreshold)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null && !user.UnreadEmailSent && !string.IsNullOrWhiteSpace(user.Email))
                {
                    // Mark that we sent the email BEFORE sending (prevent race conditions)
                    user.UnreadEmailSent = true;
                    await _context.SaveChangesAsync();

                    // Fire and forget the email so it doesn't block notification creation
                    _ = Task.Run(async () =>
                    {
                        await _emailService.SendUnreadDigestAsync(
                            user.Email!,
                            user.DisplayName ?? user.UserName ?? "",
                            unreadCount
                        );
                    });
                }
            }
        }
        catch (Exception ex)
        {
            // Never let email logic break notification creation
            _logger.LogError(ex, "[NotificationService] Email threshold check failed for user {UserId}", userId);
        }

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
