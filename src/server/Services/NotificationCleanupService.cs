using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;

namespace PrintlyServer.Services;

public class NotificationCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificationCleanupService> _logger;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(24); // Run daily
    private readonly TimeSpan _deletionThreshold = TimeSpan.FromDays(7); // Delete after 7 days

    public NotificationCleanupService(IServiceProvider serviceProvider, ILogger<NotificationCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification cleanup service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupOldNotifications();
                await Task.Delay(_cleanupInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when stopping
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in notification cleanup service");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        _logger.LogInformation("Notification cleanup service stopped");
    }

    private async Task CleanupOldNotifications()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<DatabaseContext>();

        var cutoffDate = DateTime.UtcNow - _deletionThreshold;

        // Find notifications older than 7 days that are deleted or archived
        var oldNotifications = await context
            .Notifications.Where(n => n.CreatedAt < cutoffDate && (n.IsDeleted || n.IsArchived))
            .ToListAsync();

        if (oldNotifications.Count > 0)
        {
            context.Notifications.RemoveRange(oldNotifications);
            await context.SaveChangesAsync();

            _logger.LogInformation(
                "Deleted {Count} old notifications (older than {Days} days)",
                oldNotifications.Count,
                _deletionThreshold.Days
            );
        }
    }
}
