using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers;

/// <summary>
/// Controller for managing user notifications.
/// </summary>
[Route("notification")]
[Authorize(Roles = "User,Admin")]
public class NotificationController(DatabaseContext context) : BaseController(context)
{
    public record NotificationResponse(
        Guid Id,
        NotificationType Type,
        string Title,
        string Message,
        Guid? ConversationId,
        bool IsRead,
        DateTime? ReadAt,
        bool IsArchived,
        NotificationPriority Priority,
        string? ActionUrl,
        DateTime CreatedAt
    );

    private string? GetUserId()
    {
        return User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    /// <summary>
    /// Get all notifications for current user.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<NotificationResponse>>> GetNotifications(
        [FromQuery] bool? isRead = null,
        [FromQuery] bool includeArchived = false,
        [FromQuery] int limit = 50
    )
    {
        var userId = GetUserId();
        Console.WriteLine($"[NOTIFICATION DEBUG] GetNotifications called. UserId from token: {userId}");
        
        if (userId == null)
            return Unauthorized();

        // First, let's see ALL notifications in the database for debugging
        var allNotifications = await Context.Notifications.Take(20).ToListAsync();
        Console.WriteLine($"[NOTIFICATION DEBUG] Total notifications in DB (sample): {allNotifications.Count}");
        foreach (var n in allNotifications)
        {
            Console.WriteLine($"[NOTIFICATION DEBUG] DB Notification - ID: {n.Id}, UserId: {n.UserId}, Title: {n.Title}, IsDeleted: {n.IsDeleted}");
        }

        var query = Context.Notifications.Where(n => n.UserId == userId && !n.IsDeleted);

        // Filter by read status
        if (isRead.HasValue)
        {
            query = query.Where(n => n.IsRead == isRead.Value);
        }

        // Filter archived
        if (!includeArchived)
        {
            query = query.Where(n => !n.IsArchived);
        }

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new NotificationResponse(
                n.Id,
                n.Type,
                n.Title,
                n.Message,
                n.ConversationId,
                n.IsRead,
                n.ReadAt,
                n.IsArchived,
                n.Priority,
                n.ActionUrl,
                n.CreatedAt
            ))
            .ToListAsync();

        return Ok(notifications);
    }

    /// <summary>
    /// Get unread notification count.
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var count = await Context.Notifications.CountAsync(n =>
            n.UserId == userId && !n.IsRead && !n.IsDeleted && !n.IsArchived
        );

        return Ok(count);
    }

    /// <summary>
    /// Mark notification as read.
    /// </summary>
    [HttpPost("{id:guid}/mark-read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var notification = await Context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
            return NotFound();

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await Context.SaveChangesAsync();
        }

        return Ok();
    }

    /// <summary>
    /// Mark all notifications as read.
    /// </summary>
    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var unreadNotifications = await Context
            .Notifications.Where(n => n.UserId == userId && !n.IsRead && !n.IsDeleted)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await Context.SaveChangesAsync();

        return Ok(new { count = unreadNotifications.Count });
    }

    /// <summary>
    /// Archive notification (POST method).
    /// </summary>
    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id)
    {
        return await ArchiveInternal(id);
    }

    /// <summary>
    /// Archive notification (PATCH method).
    /// </summary>
    [HttpPatch("{id:guid}/archive")]
    public async Task<IActionResult> ArchivePatch(Guid id)
    {
        return await ArchiveInternal(id);
    }

    private async Task<IActionResult> ArchiveInternal(Guid id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var notification = await Context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
            return NotFound();

        notification.IsArchived = true;
        notification.ArchivedAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();

        return Ok();
    }

    /// <summary>
    /// Unarchive notification (POST method).
    /// </summary>
    [HttpPost("{id:guid}/unarchive")]
    public async Task<IActionResult> Unarchive(Guid id)
    {
        return await UnarchiveInternal(id);
    }

    /// <summary>
    /// Unarchive notification (PATCH method).
    /// </summary>
    [HttpPatch("{id:guid}/unarchive")]
    public async Task<IActionResult> UnarchivePatch(Guid id)
    {
        return await UnarchiveInternal(id);
    }

    private async Task<IActionResult> UnarchiveInternal(Guid id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var notification = await Context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
            return NotFound();

        notification.IsArchived = false;
        notification.ArchivedAt = null;
        notification.UpdatedAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();

        return Ok();
    }

    /// <summary>
    /// Get archived notifications.
    /// </summary>
    [HttpGet("archived")]
    public async Task<ActionResult<List<NotificationResponse>>> GetArchivedNotifications([FromQuery] int limit = 50)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var notifications = await Context
            .Notifications.Where(n => n.UserId == userId && n.IsArchived && !n.IsDeleted)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new NotificationResponse(
                n.Id,
                n.Type,
                n.Title,
                n.Message,
                n.ConversationId,
                n.IsRead,
                n.ReadAt,
                n.IsArchived,
                n.Priority,
                n.ActionUrl,
                n.CreatedAt
            ))
            .ToListAsync();

        return Ok(notifications);
    }

    /// <summary>
    /// Mark notification as read (PATCH method).
    /// </summary>
    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkAsReadPatch(Guid id)
    {
        return await MarkAsRead(id);
    }

    /// <summary>
    /// Delete notification (soft delete).
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var notification = await Context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
            return NotFound();

        notification.IsDeleted = true;
        notification.DeletedAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();

        return Ok();
    }

    /// <summary>
    /// Delete all notifications (soft delete).
    /// </summary>
    [HttpDelete("all")]
    public async Task<IActionResult> DeleteAll()
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var notifications = await Context.Notifications.Where(n => n.UserId == userId && !n.IsDeleted).ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var notification in notifications)
        {
            notification.IsDeleted = true;
            notification.DeletedAt = now;
        }

        await Context.SaveChangesAsync();

        return Ok(new { count = notifications.Count });
    }
}
