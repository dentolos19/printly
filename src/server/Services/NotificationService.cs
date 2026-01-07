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
}
