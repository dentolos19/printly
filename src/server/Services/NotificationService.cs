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
        Guid? ticketId = null,
        Guid? messageId = null,
        NotificationPriority priority = NotificationPriority.Normal,
        string? actionUrl = null
    );

    Task NotifyAdminsAsync(
        NotificationType type,
        string title,
        string message,
        Guid? ticketId = null,
        NotificationPriority priority = NotificationPriority.Normal
    );

    /// <summary>
    /// Notify customer about status change with admin name
    /// </summary>
    Task NotifyStatusChangeAsync(
        Guid ticketId,
        string customerId,
        TicketStatus newStatus,
        string adminName
    );

    /// <summary>
    /// Notify customer about priority change (escalation/de-escalation)
    /// </summary>
    Task NotifyPriorityChangeAsync(
        Guid ticketId,
        string customerId,
        TicketPriority newPriority,
        string adminName
    );

    /// <summary>
    /// Notify about new message with dynamic sender name
    /// </summary>
    Task NotifyNewMessageAsync(
        Guid ticketId,
        string recipientId,
        string senderName,
        string messagePreview,
        Guid messageId
    );
}

public class NotificationService(
    DatabaseContext context,
    IHubContext<SupportHub> supportHubContext,
    ILogger<NotificationService> logger
) : INotificationService
{
    private readonly DatabaseContext _context = context;
    private readonly IHubContext<SupportHub> _supportHubContext = supportHubContext;
    private readonly ILogger<NotificationService> _logger = logger;

    public async Task CreateNotificationAsync(
        string userId,
        NotificationType type,
        string title,
        string message,
        Guid? ticketId = null,
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
            TicketId = ticketId,
            MessageId = messageId,
            Priority = priority,
            ActionUrl = actionUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();

        // Send real-time notification via SignalR
        await _supportHubContext
            .Clients.User(userId)
            .SendAsync(
                "ReceiveNotification",
                new
                {
                    id = notification.Id,
                    type = notification.Type.ToString(),
                    title = notification.Title,
                    message = notification.Message,
                    ticketId = notification.TicketId,
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
        Guid? ticketId = null,
        NotificationPriority priority = NotificationPriority.Normal
    )
    {
        // Get all admin users
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

        // Create notification for each admin
        foreach (var adminId in adminUserIds)
        {
            await CreateNotificationAsync(
                adminId,
                type,
                title,
                message,
                ticketId,
                null,
                priority,
                ticketId.HasValue ? $"/support?ticket={ticketId}" : null
            );
        }
    }

    /// <summary>
    /// Notify customer about status change with admin name
    /// </summary>
    public async Task NotifyStatusChangeAsync(
        Guid ticketId,
        string customerId,
        TicketStatus newStatus,
        string adminName
    )
    {
        var title = newStatus switch
        {
            TicketStatus.Active => "Ticket Now Active",
            TicketStatus.Resolved => "Ticket Resolved",
            TicketStatus.Closed => "Ticket Closed",
            _ => "Ticket Status Updated"
        };

        var message = $"{adminName} changed your ticket status to {newStatus}";

        await CreateNotificationAsync(
            customerId,
            NotificationType.TicketStatusChanged,
            title,
            message,
            ticketId,
            null,
            NotificationPriority.Normal,
            $"/support?ticket={ticketId}"
        );
    }

    /// <summary>
    /// Notify customer about priority change (escalation/de-escalation)
    /// </summary>
    public async Task NotifyPriorityChangeAsync(
        Guid ticketId,
        string customerId,
        TicketPriority newPriority,
        string adminName
    )
    {
        var isEscalation = newPriority >= TicketPriority.High;

        var title = isEscalation ? "Ticket Escalated" : "Ticket Priority Changed";
        var message = $"{adminName} set your ticket priority to {newPriority}";

        var notificationPriority = newPriority == TicketPriority.Urgent
            ? NotificationPriority.High
            : NotificationPriority.Normal;

        await CreateNotificationAsync(
            customerId,
            NotificationType.TicketPriorityChanged,
            title,
            message,
            ticketId,
            null,
            notificationPriority,
            $"/support?ticket={ticketId}"
        );
    }

    /// <summary>
    /// Notify about new message with dynamic sender name
    /// </summary>
    public async Task NotifyNewMessageAsync(
        Guid ticketId,
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
            ticketId,
            messageId,
            NotificationPriority.Normal,
            $"/support?ticket={ticketId}"
        );
    }
}
