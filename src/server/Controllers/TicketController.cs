using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

/// <summary>
/// Controller for managing support tickets between customers and admins.
/// </summary>
[Route("ticket")]
[Authorize(Roles = "User,Admin")]
public class TicketController(
    DatabaseContext context,
    INotificationService notificationService,
    StorageService storageService
) : BaseController(context)
{
    private readonly INotificationService _notificationService = notificationService;
    private readonly StorageService _storageService = storageService;

    public record CreateTicketRequest(string Subject, Guid? OrderId);

    public record TicketResponse(
        Guid Id,
        string CustomerId,
        string CustomerName,
        string Subject,
        TicketStatus Status,
        TicketPriority Priority,
        Guid? OrderId,
        DateTime LastMessageAt,
        int UnreadCount,
        DateTime CreatedAt
    );

    public record TicketMessageResponse(
        Guid Id,
        Guid TicketId,
        string SenderId,
        string SenderName,
        string Content,
        bool IsEdited,
        DateTime? EditedAt,
        bool IsDeleted,
        DateTime? DeletedAt,
        bool IsReadByCustomer,
        bool IsReadByAdmin,
        DateTime CreatedAt,
        Guid? ReplyToMessageId,
        string? ReplyToContent,
        string? ReplyToSenderName,
        // File attachment fields
        string? FileUrl,
        string? FileName,
        string? FileType,
        long? FileSize,
        // Voice message fields
        string? VoiceMessageUrl,
        int? VoiceMessageDuration
    );

    public record UpdateStatusRequest(TicketStatus Status);

    private async Task<bool> IsAdmin()
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return false;

        // Check if user has Admin role by joining UserRoles with Roles
        return await Context
            .UserRoles.Where(ur => ur.UserId == userId)
            .Join(Context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r)
            .AnyAsync(r => r.Name == "Admin");
    }

    /// <summary>
    /// Create a new support ticket.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TicketResponse>> CreateTicket([FromBody] CreateTicketRequest request)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var user = await Context.Users.FindAsync(userId);
        if (user == null)
            return NotFound("User not found");

        var ticket = new Ticket
        {
            CustomerId = userId,
            Subject = request.Subject,
            OrderId = request.OrderId,
            Status = TicketStatus.Pending,
            Priority = TicketPriority.Normal,
            LastMessageAt = DateTime.UtcNow,
        };

        await Context.Tickets.AddAsync(ticket);
        await Context.SaveChangesAsync();

        // Notify all admins about new ticket (fire and forget, don't fail if notification fails)
        try
        {
            await _notificationService.NotifyAdminsAsync(
                NotificationType.TicketCreated,
                "New Support Ticket",
                $"{user.UserName ?? user.Email} created a new ticket: {ticket.Subject}",
                ticket.Id,
                NotificationPriority.Normal
            );
        }
        catch (Exception ex)
        {
            // Log but don't fail the ticket creation
            Console.WriteLine($"Failed to send notification: {ex.Message}");
        }

        return Ok(
            new TicketResponse(
                ticket.Id,
                ticket.CustomerId,
                user.UserName ?? user.Email ?? "Unknown",
                ticket.Subject,
                ticket.Status,
                ticket.Priority,
                ticket.OrderId,
                ticket.LastMessageAt,
                ticket.UnreadCount,
                ticket.CreatedAt
            )
        );
    }

    /// <summary>
    /// Get all tickets. Admins see ALL tickets, users see only theirs.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<TicketResponse>>> GetTickets([FromQuery] TicketStatus? status = null)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var isAdmin = await IsAdmin();

        var query = Context.Tickets.Include(t => t.Customer).AsQueryable();

        // Non-admins only see their own tickets
        if (!isAdmin)
        {
            query = query.Where(t => t.CustomerId == userId);
        }

        // Optional status filter
        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        var tickets = await query
            .OrderByDescending(t => t.LastMessageAt)
            .Select(t => new TicketResponse(
                t.Id,
                t.CustomerId,
                t.Customer.UserName ?? t.Customer.Email ?? "Unknown",
                t.Subject,
                t.Status,
                t.Priority,
                t.OrderId,
                t.LastMessageAt,
                t.UnreadCount,
                t.CreatedAt
            ))
            .ToListAsync();

        return Ok(tickets);
    }

    /// <summary>
    /// Get a single ticket by ID.
    /// </summary>
    [HttpGet("{ticketId:guid}")]
    public async Task<ActionResult<TicketResponse>> GetTicket(Guid ticketId)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var ticket = await Context.Tickets.Include(t => t.Customer).FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null)
            return NotFound("Ticket not found");

        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != userId)
        {
            return Forbid();
        }

        return Ok(
            new TicketResponse(
                ticket.Id,
                ticket.CustomerId,
                ticket.Customer.UserName ?? ticket.Customer.Email ?? "Unknown",
                ticket.Subject,
                ticket.Status,
                ticket.Priority,
                ticket.OrderId,
                ticket.LastMessageAt,
                ticket.UnreadCount,
                ticket.CreatedAt
            )
        );
    }

    /// <summary>
    /// Get all messages in a ticket.
    /// </summary>
    [HttpGet("{ticketId:guid}/messages")]
    public async Task<ActionResult<List<TicketMessageResponse>>> GetTicketMessages(Guid ticketId)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound("Ticket not found");

        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != userId)
        {
            return Forbid();
        }

        var messagesData = await Context
            .TicketMessages.Include(m => m.Sender)
            .Include(m => m.ReplyToMessage)
                .ThenInclude(r => r!.Sender)
            .Where(m => m.TicketId == ticketId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        // Build responses with file URLs
        var messages = new List<TicketMessageResponse>();
        foreach (var m in messagesData)
        {
            string? fileUrl = null;
            string? voiceUrl = null;

            // Get file URL if present (FileUrl stores the asset ID as string)
            if (!string.IsNullOrEmpty(m.FileUrl) && Guid.TryParse(m.FileUrl, out var fileAssetId))
            {
                var fileAsset = await Context.Assets.FindAsync(fileAssetId);
                if (fileAsset != null)
                    fileUrl = await _storageService.DownloadFileAsync(fileAsset);
            }

            // Get voice URL if present
            if (!string.IsNullOrEmpty(m.VoiceMessageUrl) && Guid.TryParse(m.VoiceMessageUrl, out var voiceAssetId))
            {
                var voiceAsset = await Context.Assets.FindAsync(voiceAssetId);
                if (voiceAsset != null)
                    voiceUrl = await _storageService.DownloadFileAsync(voiceAsset);
            }

            messages.Add(
                new TicketMessageResponse(
                    m.Id,
                    m.TicketId,
                    m.SenderId,
                    m.Sender.UserName ?? m.Sender.Email ?? "Unknown",
                    m.Content,
                    m.IsEdited,
                    m.EditedAt,
                    m.IsDeleted,
                    m.DeletedAt,
                    m.IsReadByCustomer,
                    m.IsReadByAdmin,
                    m.CreatedAt,
                    m.ReplyToMessageId,
                    m.ReplyToMessage?.Content,
                    m.ReplyToMessage?.Sender?.UserName ?? m.ReplyToMessage?.Sender?.Email,
                    fileUrl,
                    m.FileName,
                    m.FileType,
                    m.FileSize,
                    voiceUrl,
                    m.VoiceMessageDuration
                )
            );
        }

        return Ok(messages);
    }

    /// <summary>
    /// Mark all messages in a ticket as read.
    /// </summary>
    [HttpPost("{ticketId:guid}/mark-read")]
    public async Task<IActionResult> MarkAsRead(Guid ticketId)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound();

        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != userId)
        {
            return Forbid();
        }

        var messages = await Context.TicketMessages.Where(m => m.TicketId == ticketId).ToListAsync();

        foreach (var msg in messages)
        {
            if (isAdmin)
            {
                msg.IsReadByAdmin = true;
            }
            else
            {
                msg.IsReadByCustomer = true;
            }
        }

        if (!isAdmin)
        {
            ticket.UnreadCount = 0;
        }

        await Context.SaveChangesAsync();
        return Ok();
    }

    /// <summary>
    /// Update ticket status (Admin only).
    /// </summary>
    [HttpPut("{ticketId:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTicketStatus(Guid ticketId, [FromBody] UpdateStatusRequest request)
    {
        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound();

        var oldStatus = ticket.Status;
        ticket.Status = request.Status;
        await Context.SaveChangesAsync();

        // Notify customer about status change
        await _notificationService.CreateNotificationAsync(
            ticket.CustomerId,
            NotificationType.TicketStatusChanged,
            "Ticket Status Updated",
            $"Your ticket status changed from {oldStatus} to {request.Status}",
            ticket.Id,
            null,
            NotificationPriority.Normal,
            $"/support?ticket={ticketId}"
        );

        return Ok();
    }

    /// <summary>
    /// Update ticket priority (Admin only).
    /// </summary>
    [HttpPut("{ticketId:guid}/priority")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTicketPriority(Guid ticketId, [FromBody] TicketPriority priority)
    {
        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound();

        var oldPriority = ticket.Priority;
        ticket.Priority = priority;
        await Context.SaveChangesAsync();

        // Notify customer about priority change
        await _notificationService.CreateNotificationAsync(
            ticket.CustomerId,
            NotificationType.TicketPriorityChanged,
            "Ticket Priority Changed",
            $"Your ticket priority changed from {oldPriority} to {priority}",
            ticket.Id,
            null,
            NotificationPriority.Normal,
            $"/support?ticket={ticketId}"
        );

        return Ok();
    }

    /// <summary>
    /// Upload a file for a ticket message.
    /// Returns the asset ID which can be used with SendTicketMessageWithFile.
    /// </summary>
    [HttpPost("upload-file")]
    public async Task<ActionResult<FileUploadResponse>> UploadFile([FromForm] IFormFile file)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        // Validate file
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        // Check file size (max 50MB)
        if (file.Length > 50 * 1024 * 1024)
            return BadRequest("File too large. Maximum size is 50MB");

        // Allowed file types
        var allowedTypes = new[]
        {
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/pdf",
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "audio/webm",
            "video/mp4",
            "video/webm",
        };

        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest($"File type not allowed: {file.ContentType}");

        try
        {
            // Upload to storage
            using var stream = file.OpenReadStream();
            var asset = await _storageService.UploadFileAsync(stream, file.FileName, "ticket");

            // Generate download URL
            var fileUrl = await _storageService.DownloadFileAsync(asset);

            return Ok(new FileUploadResponse(asset.Id, fileUrl, asset.Name, asset.Type, asset.Size));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Failed to upload file: {ex.Message}");
        }
    }

    public record FileUploadResponse(Guid FileId, string FileUrl, string FileName, string FileType, long FileSize);
}
