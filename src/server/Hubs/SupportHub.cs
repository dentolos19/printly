using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Hubs;

/// <summary>
/// Real-time hub for customer support tickets.
/// Handles messaging, typing indicators, read receipts, and ticket management.
/// </summary>
[Authorize(Roles = "User,Admin")]
public class SupportHub(
    DatabaseContext context,
    ILogger<SupportHub> logger,
    INotificationService notificationService,
    StorageService storageService
) : Hub
{
    private readonly DatabaseContext _context = context;
    private readonly ILogger<SupportHub> _logger = logger;
    private readonly INotificationService _notificationService = notificationService;
    private readonly StorageService _storageService = storageService;

    #region Response DTOs

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

    public record MessageEditedResponse(
        Guid MessageId,
        Guid TicketId,
        string Content,
        bool IsEdited,
        DateTime EditedAt
    );

    public record MessageDeletedResponse(Guid MessageId, Guid TicketId, bool IsDeleted, DateTime DeletedAt);

    public record ReadReceiptResponse(Guid TicketId, string ReaderId, List<Guid> MessageIds, DateTime ReadAt);

    public record StatusUpdatedResponse(
        Guid TicketId,
        TicketStatus Status,
        string UpdatedByUserId,
        string UpdatedByUserName,
        DateTime UpdatedAt
    );

    public record PriorityUpdatedResponse(
        Guid TicketId,
        TicketPriority Priority,
        string UpdatedByUserId,
        string UpdatedByUserName,
        DateTime UpdatedAt
    );

    #endregion

    #region Helpers

    private string? GetUserId()
    {
        return Context.UserIdentifier
            ?? Context.User?.FindFirst("sub")?.Value
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    private async Task<bool> IsAdmin()
    {
        var userId = GetUserId();
        if (userId == null)
            return false;

        var userRoles = await _context.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToListAsync();
        var adminRoles = await _context.Roles.Where(r => userRoles.Contains(r.Id) && r.Name == "Admin").AnyAsync();

        return adminRoles;
    }

    private async Task<string> GetUserDisplayNameAsync(string userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.UserName ?? user?.Email ?? "Unknown";
    }

    /// <summary>
    /// Check if user has access to this ticket (must be owner or admin)
    /// </summary>
    private async Task<bool> HasTicketAccessAsync(Guid ticketId, string userId)
    {
        var isAdmin = await IsAdmin();
        if (isAdmin)
            return true;

        var ticket = await _context.Tickets.FindAsync(ticketId);
        return ticket != null && ticket.CustomerId == userId;
    }

    #endregion

    #region Connection Management

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        _logger.LogInformation("[SupportHub] User connected: {UserId}", userId);

        // Add admins to the Admins group so we can broadcast to them
        if (await IsAdmin())
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
            _logger.LogInformation("[SupportHub] Added admin to Admins group");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        _logger.LogInformation("[SupportHub] User disconnecting: {UserId}", userId);

        await base.OnDisconnectedAsync(exception);
    }

    #endregion

    #region Messaging

    /// <summary>
    /// Send a new message in a support ticket.
    /// Supports reply-to for quoting previous messages.
    /// </summary>
    public async Task SendTicketMessage(Guid ticketId, string content, Guid? replyToMessageId = null)
    {
        var senderId = GetUserId();
        if (senderId == null)
            throw new HubException("User not authenticated");

        if (string.IsNullOrWhiteSpace(content))
            throw new HubException("Message cannot be empty");

        var sender = await _context.Users.FindAsync(senderId);
        if (sender == null)
            throw new HubException("Sender not found");

        var ticket = await _context.Tickets.Include(t => t.Customer).FirstOrDefaultAsync(t => t.Id == ticketId);
        if (ticket == null)
            throw new HubException("Ticket not found");

        // Check authorization: must be the ticket owner or an admin
        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != senderId)
            throw new HubException("Unauthorized to access this ticket");

        // Validate reply-to message if provided
        TicketMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .TicketMessages.Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value && m.TicketId == ticketId);
        }

        // Create the message
        var message = new TicketMessage
        {
            TicketId = ticketId,
            SenderId = senderId,
            Content = content.Trim(),
            IsReadByCustomer = isAdmin, // If admin sends, customer hasn't read yet
            IsReadByAdmin = !isAdmin, // If customer sends, admin hasn't read yet
            ReplyToMessageId = replyToMessage?.Id,
        };

        await _context.TicketMessages.AddAsync(message);

        // Update ticket metadata
        ticket.LastMessageAt = DateTime.UtcNow;
        if (!isAdmin)
        {
            ticket.UnreadCount++;
        }
        // Auto-activate pending tickets when someone replies
        if (ticket.Status == TicketStatus.Pending && isAdmin)
        {
            ticket.Status = TicketStatus.Active;
        }

        await _context.SaveChangesAsync();

        // Build response with reply info
        var response = new TicketMessageResponse(
            message.Id,
            message.TicketId,
            message.SenderId,
            sender.UserName ?? sender.Email ?? "Unknown",
            message.Content,
            message.IsEdited,
            message.EditedAt,
            message.IsDeleted,
            message.DeletedAt,
            message.IsReadByCustomer,
            message.IsReadByAdmin,
            message.CreatedAt,
            message.ReplyToMessageId,
            replyToMessage?.Content,
            replyToMessage?.Sender?.UserName ?? replyToMessage?.Sender?.Email,
            null, // FileUrl
            null, // FileName
            null, // FileType
            null, // FileSize
            null, // VoiceMessageUrl
            null // VoiceMessageDuration
        );

        // Send to all admins and the customer
        await Clients.Group("Admins").SendAsync("ReceiveTicketMessage", response);
        await Clients.User(ticket.CustomerId).SendAsync("ReceiveTicketMessage", response);

        // Send notification with dynamic sender name
        var messagePreview = content.Length > 50 ? content.Substring(0, 50) + "..." : content;
        var senderName = sender.UserName ?? sender.Email ?? "Unknown";

        if (isAdmin)
        {
            // Admin replied, notify customer with admin's name
            await _notificationService.NotifyNewMessageAsync(
                ticketId,
                ticket.CustomerId,
                senderName,
                messagePreview,
                message.Id
            );
        }
        else
        {
            // Customer sent message, notify all admins
            await _notificationService.NotifyAdminsAsync(
                NotificationType.NewMessage,
                "New Customer Message",
                $"{senderName}: {messagePreview}",
                ticketId,
                NotificationPriority.Normal
            );
        }

        _logger.LogInformation("[SupportHub] Message sent in ticket {TicketId} by {UserId}", ticketId, senderId);
    }

    /// <summary>
    /// Edit your own message in a ticket.
    /// Only the original sender can edit their messages.
    /// </summary>
    public async Task EditMessage(Guid messageId, string newContent)
    {
        var userId = GetUserId();
        if (userId == null)
            throw new HubException("User not authenticated");

        if (string.IsNullOrWhiteSpace(newContent))
            throw new HubException("Message cannot be empty");

        var message = await _context.TicketMessages.Include(m => m.Ticket).FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null)
            throw new HubException("Message not found");

        // Only the sender can edit their own messages
        if (message.SenderId != userId)
        {
            _logger.LogWarning(
                "[SupportHub] Unauthorized edit attempt by {UserId} on message {MessageId}",
                userId,
                messageId
            );
            throw new HubException("You can only edit your own messages");
        }

        if (message.IsDeleted)
            throw new HubException("Cannot edit a deleted message");

        // Update the message
        message.Content = newContent.Trim();
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var response = new MessageEditedResponse(
            message.Id,
            message.TicketId,
            message.Content,
            message.IsEdited,
            message.EditedAt.Value
        );

        // Broadcast to admins and the customer
        await Clients.Group("Admins").SendAsync("MessageEdited", response);
        await Clients.User(message.Ticket.CustomerId).SendAsync("MessageEdited", response);

        _logger.LogDebug("[SupportHub] User {UserId} edited message {MessageId}", userId, messageId);
    }

    /// <summary>
    /// Soft delete your own message in a ticket.
    /// The message content is replaced with "This message was deleted".
    /// </summary>
    public async Task DeleteMessage(Guid messageId)
    {
        var userId = GetUserId();
        if (userId == null)
            throw new HubException("User not authenticated");

        var message = await _context.TicketMessages.Include(m => m.Ticket).FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null)
            throw new HubException("Message not found");

        // Only the sender can delete their own messages
        if (message.SenderId != userId)
        {
            _logger.LogWarning(
                "[SupportHub] Unauthorized delete attempt by {UserId} on message {MessageId}",
                userId,
                messageId
            );
            throw new HubException("You can only delete your own messages");
        }

        if (message.IsDeleted)
            throw new HubException("Message is already deleted");

        // Soft delete the message
        message.IsDeleted = true;
        message.DeletedAt = DateTime.UtcNow;
        message.Content = "This message was deleted";

        await _context.SaveChangesAsync();

        var response = new MessageDeletedResponse(
            message.Id,
            message.TicketId,
            message.IsDeleted,
            message.DeletedAt.Value
        );

        // Broadcast to admins and the customer
        await Clients.Group("Admins").SendAsync("MessageDeleted", response);
        await Clients.User(message.Ticket.CustomerId).SendAsync("MessageDeleted", response);

        _logger.LogDebug("[SupportHub] User {UserId} deleted message {MessageId}", userId, messageId);
    }

    /// <summary>
    /// Send a message with a file attachment.
    /// The file should be uploaded first via the REST API, then this method is called with the asset ID.
    /// </summary>
    public async Task SendTicketMessageWithFile(
        Guid ticketId,
        string content,
        Guid fileAssetId,
        Guid? replyToMessageId = null
    )
    {
        var senderId = GetUserId();
        if (senderId == null)
            throw new HubException("User not authenticated");

        var sender = await _context.Users.FindAsync(senderId);
        if (sender == null)
            throw new HubException("Sender not found");

        var ticket = await _context.Tickets.Include(t => t.Customer).FirstOrDefaultAsync(t => t.Id == ticketId);
        if (ticket == null)
            throw new HubException("Ticket not found");

        // Check authorization
        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != senderId)
            throw new HubException("Unauthorized to access this ticket");

        // Get the file asset
        var fileAsset = await _context.Assets.FindAsync(fileAssetId);
        if (fileAsset == null)
            throw new HubException("File not found");

        // Validate reply-to message if provided
        TicketMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .TicketMessages.Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value && m.TicketId == ticketId);
        }

        // Create the message with file attachment
        var message = new TicketMessage
        {
            TicketId = ticketId,
            SenderId = senderId,
            Content = string.IsNullOrWhiteSpace(content) ? "" : content.Trim(),
            IsReadByCustomer = isAdmin,
            IsReadByAdmin = !isAdmin,
            ReplyToMessageId = replyToMessage?.Id,
            FileUrl = fileAsset.Id.ToString(),
            FileName = fileAsset.Name,
            FileType = fileAsset.Type,
            FileSize = fileAsset.Size,
        };

        await _context.TicketMessages.AddAsync(message);

        // Update ticket metadata
        ticket.LastMessageAt = DateTime.UtcNow;
        if (!isAdmin)
            ticket.UnreadCount++;

        if (ticket.Status == TicketStatus.Pending && isAdmin)
            ticket.Status = TicketStatus.Active;

        await _context.SaveChangesAsync();

        // Get the file download URL
        var fileUrl = await _storageService.DownloadFileAsync(fileAsset);

        // Build response
        var response = new TicketMessageResponse(
            message.Id,
            message.TicketId,
            message.SenderId,
            sender.UserName ?? sender.Email ?? "Unknown",
            message.Content,
            message.IsEdited,
            message.EditedAt,
            message.IsDeleted,
            message.DeletedAt,
            message.IsReadByCustomer,
            message.IsReadByAdmin,
            message.CreatedAt,
            message.ReplyToMessageId,
            replyToMessage?.Content,
            replyToMessage?.Sender?.UserName ?? replyToMessage?.Sender?.Email,
            fileUrl,
            message.FileName,
            message.FileType,
            message.FileSize,
            null,
            null
        );

        // Broadcast to admins and the customer
        await Clients.Group("Admins").SendAsync("ReceiveTicketMessage", response);
        await Clients.User(ticket.CustomerId).SendAsync("ReceiveTicketMessage", response);

        // Send notification
        var notificationContent = fileAsset.Type?.StartsWith("image/") == true ? "sent an image" : "sent a file";
        if (isAdmin)
        {
            await _notificationService.CreateNotificationAsync(
                ticket.CustomerId,
                NotificationType.NewMessage,
                "New Attachment from Support",
                $"{sender.UserName ?? "Admin"} {notificationContent}",
                ticketId,
                message.Id,
                NotificationPriority.Normal,
                $"/support?ticket={ticketId}"
            );
        }
        else
        {
            await _notificationService.NotifyAdminsAsync(
                NotificationType.NewMessage,
                "New Customer Attachment",
                $"{sender.UserName ?? sender.Email} {notificationContent} in ticket: {ticket.Subject}",
                ticketId,
                NotificationPriority.Normal
            );
        }

        _logger.LogInformation(
            "[SupportHub] File message sent in ticket {TicketId} by {UserId}, file: {FileName}",
            ticketId,
            senderId,
            fileAsset.Name
        );
    }

    /// <summary>
    /// Send a voice message.
    /// The audio file should be uploaded first via the REST API, then this method is called with the asset ID.
    /// </summary>
    public async Task SendVoiceMessage(
        Guid ticketId,
        Guid voiceAssetId,
        int durationSeconds,
        Guid? replyToMessageId = null
    )
    {
        var senderId = GetUserId();
        if (senderId == null)
            throw new HubException("User not authenticated");

        var sender = await _context.Users.FindAsync(senderId);
        if (sender == null)
            throw new HubException("Sender not found");

        var ticket = await _context.Tickets.Include(t => t.Customer).FirstOrDefaultAsync(t => t.Id == ticketId);
        if (ticket == null)
            throw new HubException("Ticket not found");

        // Check authorization
        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != senderId)
            throw new HubException("Unauthorized to access this ticket");

        // Get the voice asset
        var voiceAsset = await _context.Assets.FindAsync(voiceAssetId);
        if (voiceAsset == null)
            throw new HubException("Voice file not found");

        // Validate reply-to message if provided
        TicketMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .TicketMessages.Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value && m.TicketId == ticketId);
        }

        // Create the voice message
        var message = new TicketMessage
        {
            TicketId = ticketId,
            SenderId = senderId,
            Content = "🎤 Voice message",
            IsReadByCustomer = isAdmin,
            IsReadByAdmin = !isAdmin,
            ReplyToMessageId = replyToMessage?.Id,
            VoiceMessageUrl = voiceAsset.Id.ToString(),
            VoiceMessageDuration = durationSeconds,
        };

        await _context.TicketMessages.AddAsync(message);

        // Update ticket metadata
        ticket.LastMessageAt = DateTime.UtcNow;
        if (!isAdmin)
            ticket.UnreadCount++;

        if (ticket.Status == TicketStatus.Pending && isAdmin)
            ticket.Status = TicketStatus.Active;

        await _context.SaveChangesAsync();

        // Get the voice file URL
        var voiceUrl = await _storageService.DownloadFileAsync(voiceAsset);

        // Build response
        var response = new TicketMessageResponse(
            message.Id,
            message.TicketId,
            message.SenderId,
            sender.UserName ?? sender.Email ?? "Unknown",
            message.Content,
            message.IsEdited,
            message.EditedAt,
            message.IsDeleted,
            message.DeletedAt,
            message.IsReadByCustomer,
            message.IsReadByAdmin,
            message.CreatedAt,
            message.ReplyToMessageId,
            replyToMessage?.Content,
            replyToMessage?.Sender?.UserName ?? replyToMessage?.Sender?.Email,
            null,
            null,
            null,
            null,
            voiceUrl,
            message.VoiceMessageDuration
        );

        // Broadcast to admins and the customer
        await Clients.Group("Admins").SendAsync("ReceiveTicketMessage", response);
        await Clients.User(ticket.CustomerId).SendAsync("ReceiveTicketMessage", response);

        // Send notification
        if (isAdmin)
        {
            await _notificationService.CreateNotificationAsync(
                ticket.CustomerId,
                NotificationType.NewMessage,
                "New Voice Message from Support",
                $"{sender.UserName ?? "Admin"} sent a voice message",
                ticketId,
                message.Id,
                NotificationPriority.Normal,
                $"/support?ticket={ticketId}"
            );
        }
        else
        {
            await _notificationService.NotifyAdminsAsync(
                NotificationType.NewMessage,
                "New Customer Voice Message",
                $"{sender.UserName ?? sender.Email} sent a voice message in ticket: {ticket.Subject}",
                ticketId,
                NotificationPriority.Normal
            );
        }

        _logger.LogInformation(
            "[SupportHub] Voice message sent in ticket {TicketId} by {UserId}, duration: {Duration}s",
            ticketId,
            senderId,
            durationSeconds
        );
    }

    #endregion

    #region Read Receipts

    /// <summary>
    /// Mark all unread messages in a ticket as read.
    /// Admins mark customer messages as read, customers mark admin messages as read.
    /// </summary>
    public async Task MarkTicketRead(Guid ticketId)
    {
        var userId = GetUserId();
        if (userId == null)
            throw new HubException("User not authenticated");

        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            throw new HubException("Ticket not found");

        var isAdmin = await IsAdmin();

        // Check authorization
        if (!isAdmin && ticket.CustomerId != userId)
            throw new HubException("Unauthorized to access this ticket");

        List<TicketMessage> unreadMessages;

        if (isAdmin)
        {
            // Admin is reading, mark all customer messages as read by admin
            unreadMessages = await _context
                .TicketMessages.Where(m =>
                    m.TicketId == ticketId && !m.IsReadByAdmin && m.SenderId == ticket.CustomerId
                )
                .ToListAsync();

            foreach (var msg in unreadMessages)
            {
                msg.IsReadByAdmin = true;
            }

            // Reset unread count when admin reads
            ticket.UnreadCount = 0;
        }
        else
        {
            // Customer is reading, mark all admin messages as read by customer
            unreadMessages = await _context
                .TicketMessages.Where(m =>
                    m.TicketId == ticketId && !m.IsReadByCustomer && m.SenderId != ticket.CustomerId
                )
                .ToListAsync();

            foreach (var msg in unreadMessages)
            {
                msg.IsReadByCustomer = true;
            }
        }

        if (unreadMessages.Count == 0)
            return;

        await _context.SaveChangesAsync();

        var now = DateTime.UtcNow;
        var response = new ReadReceiptResponse(ticketId, userId, unreadMessages.Select(m => m.Id).ToList(), now);

        // Broadcast read receipt to admins and customer
        await Clients.Group("Admins").SendAsync("TicketMessagesRead", response);
        await Clients.User(ticket.CustomerId).SendAsync("TicketMessagesRead", response);

        _logger.LogDebug(
            "[SupportHub] User {UserId} marked {Count} messages as read in ticket {TicketId}",
            userId,
            unreadMessages.Count,
            ticketId
        );
    }

    #endregion

    #region Typing Indicators

    /// <summary>
    /// Broadcast that user started typing in a ticket.
    /// This is an ephemeral event, not persisted to database.
    /// </summary>
    public async Task StartTypingInTicket(Guid ticketId)
    {
        var senderId = GetUserId();
        if (senderId == null)
            return;

        var sender = await _context.Users.FindAsync(senderId);
        if (sender == null)
            return;

        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return;

        var isAdmin = await IsAdmin();

        var typingData = new
        {
            userId = senderId,
            userName = sender.UserName ?? sender.Email,
            ticketId = ticketId,
            isAdmin = isAdmin,
        };

        // Send to the appropriate party
        if (!isAdmin)
        {
            // Customer typing, notify all admins
            await Clients.Group("Admins").SendAsync("UserStartedTyping", typingData);
        }
        else
        {
            // Admin typing, notify the customer
            await Clients.User(ticket.CustomerId).SendAsync("UserStartedTyping", typingData);
        }

        _logger.LogDebug("[SupportHub] {SenderId} started typing in ticket {TicketId}", senderId, ticketId);
    }

    /// <summary>
    /// Broadcast that user stopped typing in a ticket.
    /// This is an ephemeral event, not persisted to database.
    /// </summary>
    public async Task StopTypingInTicket(Guid ticketId)
    {
        var senderId = GetUserId();
        if (senderId == null)
            return;

        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return;

        var isAdmin = await IsAdmin();

        var typingData = new { userId = senderId, ticketId = ticketId };

        if (!isAdmin)
        {
            await Clients.Group("Admins").SendAsync("UserStoppedTyping", typingData);
        }
        else
        {
            await Clients.User(ticket.CustomerId).SendAsync("UserStoppedTyping", typingData);
        }

        _logger.LogDebug("[SupportHub] {SenderId} stopped typing in ticket {TicketId}", senderId, ticketId);
    }

    #endregion

    #region Status and Priority Management (Admin Only)

    /// <summary>
    /// Update ticket status. Only admins can do this.
    /// Broadcasts the change to all connected clients in real time.
    /// </summary>
    public async Task UpdateTicketStatus(Guid ticketId, TicketStatus newStatus)
    {
        var userId = GetUserId();
        if (userId == null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdmin();
        if (!isAdmin)
            throw new HubException("Only admins can update ticket status");

        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            throw new HubException("Ticket not found");

        var oldStatus = ticket.Status;
        ticket.Status = newStatus;

        await _context.SaveChangesAsync();

        var userName = await GetUserDisplayNameAsync(userId);

        var response = new StatusUpdatedResponse(ticketId, newStatus, userId, userName, DateTime.UtcNow);

        // Broadcast to admins and the customer
        await Clients.Group("Admins").SendAsync("TicketStatusUpdated", response);
        await Clients.User(ticket.CustomerId).SendAsync("TicketStatusUpdated", response);

        // Notify customer about all status changes with admin name
        await _notificationService.NotifyStatusChangeAsync(
            ticketId,
            ticket.CustomerId,
            newStatus,
            userName
        );

        _logger.LogInformation(
            "[SupportHub] Ticket {TicketId} status changed from {OldStatus} to {NewStatus} by {UserId}",
            ticketId,
            oldStatus,
            newStatus,
            userId
        );
    }

    /// <summary>
    /// Update ticket priority. Only admins can do this.
    /// Broadcasts the change to all connected clients in real time.
    /// </summary>
    public async Task UpdateTicketPriority(Guid ticketId, TicketPriority newPriority)
    {
        var userId = GetUserId();
        if (userId == null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdmin();
        if (!isAdmin)
            throw new HubException("Only admins can update ticket priority");

        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            throw new HubException("Ticket not found");

        var oldPriority = ticket.Priority;
        ticket.Priority = newPriority;

        await _context.SaveChangesAsync();

        var userName = await GetUserDisplayNameAsync(userId);

        var response = new PriorityUpdatedResponse(ticketId, newPriority, userId, userName, DateTime.UtcNow);

        // Broadcast to admins and the customer
        await Clients.Group("Admins").SendAsync("TicketPriorityUpdated", response);
        await Clients.User(ticket.CustomerId).SendAsync("TicketPriorityUpdated", response);

        // Notify customer about priority change (escalation/de-escalation)
        await _notificationService.NotifyPriorityChangeAsync(
            ticketId,
            ticket.CustomerId,
            newPriority,
            userName
        );

        _logger.LogInformation(
            "[SupportHub] Ticket {TicketId} priority changed from {OldPriority} to {NewPriority} by {UserId}",
            ticketId,
            oldPriority,
            newPriority,
            userId
        );
    }

    #endregion

    #region Broadcast

    /// <summary>
    /// Admin broadcasts an announcement to everyone.
    /// </summary>
    [Authorize(Roles = "Admin")]
    public async Task SendBroadcast(string title, string content)
    {
        var senderId = GetUserId();
        if (senderId == null)
            throw new HubException("User not authenticated");

        var broadcast = new Broadcast
        {
            SenderId = senderId,
            Title = title,
            Content = content,
            IsActive = true,
        };

        await _context.Broadcasts.AddAsync(broadcast);
        await _context.SaveChangesAsync();

        // Send to ALL connected users
        await Clients.All.SendAsync(
            "ReceiveBroadcast",
            new
            {
                id = broadcast.Id,
                title = broadcast.Title,
                content = broadcast.Content,
                createdAt = broadcast.CreatedAt,
            }
        );

        _logger.LogInformation("[SupportHub] Broadcast sent: {Title}", title);
    }

    #endregion
}
