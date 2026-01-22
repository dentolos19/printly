using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Hubs;

/// <summary>
/// SignalR hub for real-time private messaging between users.
/// </summary>
[Authorize(Roles = "User,Admin")]
public class ChatHub(DatabaseContext context, ILogger<ChatHub> logger) : Hub
{
    private readonly DatabaseContext _context = context;
    private readonly ILogger<ChatHub> _logger = logger;

    /// <summary>
    /// Track online users: UserId -> set of ConnectionIds
    /// </summary>
    private static readonly ConcurrentDictionary<string, HashSet<string>> OnlineUsers = new();

    /// <summary>
    /// Response DTO for messages.
    /// </summary>
    public record MessageResponse(
        Guid Id,
        string Content,
        string SenderId,
        string SenderName,
        string ReceiverId,
        bool IsRead,
        DateTime? ReadAt,
        bool IsEdited,
        DateTime? EditedAt,
        bool IsDeleted,
        DateTime? DeletedAt,
        DateTime CreatedAt,
        Guid? ReplyToMessageId,
        string? ReplyToContent,
        string? ReplyToSenderName
    );

    /// <summary>
    /// Gets the user ID from the context, trying multiple claim types.
    /// </summary>
    private string? GetUserId()
    {
        // First try Context.UserIdentifier (uses IUserIdProvider)
        if (!string.IsNullOrEmpty(Context.UserIdentifier))
            return Context.UserIdentifier;

        // Fallback: Try to get from "sub" claim directly (with MapInboundClaims = false)
        var user = Context.User;
        return user?.FindFirst("sub")?.Value ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    /// <summary>
    /// Sends a private message to a specific user.
    /// </summary>
    public async Task SendMessage(string receiverId, string message, Guid? replyToMessageId = null)
    {
        var senderId = GetUserId();

        _logger.LogInformation(
            "SendMessage called - SenderId: {SenderId}, ReceiverId: {ReceiverId}",
            senderId,
            receiverId
        );

        // Debug: Log all claims
        if (Context.User?.Claims != null)
        {
            foreach (var claim in Context.User.Claims)
            {
                _logger.LogInformation("Claim: {Type} = {Value}", claim.Type, claim.Value);
            }
        }

        if (string.IsNullOrEmpty(senderId))
        {
            _logger.LogWarning("User is not authenticated - no user ID found in claims");
            throw new HubException("User is not authenticated.");
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new HubException("Message cannot be empty.");
        }

        // Get sender info
        var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == senderId);

        if (sender is null)
        {
            _logger.LogError("Sender not found in database. SenderId: {SenderId}", senderId);

            // Debug: list all user IDs
            var allUserIds = await _context.Users.Select(u => u.Id).ToListAsync();
            _logger.LogInformation("All user IDs in database: {UserIds}", string.Join(", ", allUserIds));

            throw new HubException("Sender not found.");
        }

        _logger.LogInformation("Sender found: {Email}", sender.Email);

        // Validate receiver exists in the database (CRITICAL for foreign key constraint)
        var receiver = await _context.Users.FirstOrDefaultAsync(u => u.Id == receiverId);
        if (receiver is null)
        {
            _logger.LogError("Receiver not found in database. ReceiverId: {ReceiverId}", receiverId);
            throw new HubException("Receiver not found. The user may not exist.");
        }

        _logger.LogInformation("Receiver found: {Email}", receiver.Email);

        // Validate reply-to message if provided
        Message? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .Messages.Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value);
            if (replyToMessage == null)
            {
                _logger.LogWarning("Reply-to message {MessageId} not found", replyToMessageId);
            }
        }

        // Create message
        var msg = new Message
        {
            Content = message.Trim(),
            SenderId = senderId,
            ReceiverId = receiverId,
            ReplyToMessageId = replyToMessageId,
        };

        _context.Messages.Add(msg);
        await _context.SaveChangesAsync();

        // Build response with reply info
        string? replyToContent = null;
        string? replyToSenderName = null;
        if (replyToMessage != null)
        {
            replyToContent = replyToMessage.Content;
            replyToSenderName = replyToMessage.Sender?.UserName ?? "Unknown";
        }

        var response = new MessageResponse(
            msg.Id,
            msg.Content,
            msg.SenderId,
            sender.UserName ?? sender.Email ?? "Unknown",
            msg.ReceiverId,
            msg.IsRead,
            msg.ReadAt,
            msg.IsEdited,
            msg.EditedAt,
            msg.IsDeleted,
            msg.DeletedAt,
            msg.CreatedAt,
            msg.ReplyToMessageId,
            replyToContent,
            replyToSenderName
        );

        // Send to both users
        await Clients.User(receiverId).SendAsync("ReceiveMessage", response);
        await Clients.User(senderId).SendAsync("ReceiveMessage", response);

        _logger.LogInformation("Message sent successfully from {Sender} to {Receiver}", senderId, receiverId);
    }

    /// <summary>
    /// User started typing - send ephemeral event to receiver
    /// </summary>
    public async Task StartTyping(string receiverId)
    {
        var senderId = GetUserId();
        if (senderId == null)
            return;

        // Only notify if receiver is online
        if (OnlineUsers.TryGetValue(receiverId, out var receiverConnections))
        {
            foreach (var connectionId in receiverConnections)
            {
                await Clients.Client(connectionId).SendAsync("UserStartedTyping", senderId);
            }
        }

        _logger.LogDebug("[ChatHub] {SenderId} started typing to {ReceiverId}", senderId, receiverId);
    }

    /// <summary>
    /// User stopped typing - send ephemeral event to receiver
    /// </summary>
    public async Task StopTyping(string receiverId)
    {
        var senderId = GetUserId();
        if (senderId == null)
            return;

        // Only notify if receiver is online
        if (OnlineUsers.TryGetValue(receiverId, out var receiverConnections))
        {
            foreach (var connectionId in receiverConnections)
            {
                await Clients.Client(connectionId).SendAsync("UserStoppedTyping", senderId);
            }
        }

        _logger.LogDebug("[ChatHub] {SenderId} stopped typing to {ReceiverId}", senderId, receiverId);
    }

    /// <summary>
    /// Called when a user connects.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();

        _logger.LogInformation(
            "User connecting - UserId: {UserId}, ConnectionId: {ConnectionId}",
            userId,
            Context.ConnectionId
        );

        if (!string.IsNullOrEmpty(userId))
        {
            OnlineUsers.AddOrUpdate(
                userId,
                _ => [Context.ConnectionId],
                (_, connections) =>
                {
                    lock (connections)
                    {
                        connections.Add(Context.ConnectionId);
                    }
                    return connections;
                }
            );

            await Clients.All.SendAsync("UserOnline", userId);
        }

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a user disconnects.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();

        _logger.LogInformation("User disconnecting - UserId: {UserId}", userId);

        if (!string.IsNullOrEmpty(userId) && OnlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(Context.ConnectionId);

                if (connections.Count == 0)
                {
                    OnlineUsers.TryRemove(userId, out _);
                    Clients.All.SendAsync("UserOffline", userId).Wait();
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Gets currently online user IDs.
    /// </summary>
    public Task<List<string>> GetOnlineUsers() => Task.FromResult(OnlineUsers.Keys.ToList());

    /// <summary>
    /// Mark a single message as read.
    /// </summary>
    public async Task MarkMessageAsRead(Guid messageId)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            throw new HubException("User not authenticated");
        }

        var message = await _context.Messages.FindAsync(messageId);
        if (message == null)
        {
            _logger.LogWarning("Message {MessageId} not found", messageId);
            return;
        }

        // Only the receiver can mark as read
        if (message.ReceiverId != userId)
        {
            return;
        }

        if (!message.IsRead)
        {
            message.IsRead = true;
            message.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Notify sender that message was read
            if (OnlineUsers.TryGetValue(message.SenderId, out var senderConnections))
            {
                foreach (var connectionId in senderConnections)
                {
                    await Clients
                        .Client(connectionId)
                        .SendAsync("MessageRead", new { messageId = message.Id, readAt = message.ReadAt });
                }
            }

            _logger.LogInformation("Message {MessageId} marked as read by {UserId}", messageId, userId);
        }
    }

    /// <summary>
    /// Mark all messages from a specific user as read.
    /// </summary>
    public async Task MarkAllMessagesAsRead(string senderId)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            throw new HubException("User not authenticated");
        }

        var unreadMessages = await _context
            .Messages.Where(m => m.SenderId == senderId && m.ReceiverId == userId && !m.IsRead)
            .ToListAsync();

        if (unreadMessages.Count == 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
            message.ReadAt = now;
        }

        await _context.SaveChangesAsync();

        // Notify sender that messages were read
        if (OnlineUsers.TryGetValue(senderId, out var senderConnections))
        {
            foreach (var connectionId in senderConnections)
            {
                await Clients
                    .Client(connectionId)
                    .SendAsync(
                        "MessagesRead",
                        new
                        {
                            readBy = userId,
                            messageIds = unreadMessages.Select(m => m.Id).ToList(),
                            readAt = now,
                        }
                    );
            }
        }

        _logger.LogInformation("Marked {Count} messages as read from {SenderId}", unreadMessages.Count, senderId);
    }

    /// <summary>
    /// Edit your own message.
    /// </summary>
    public async Task EditMessage(Guid messageId, string newContent)
    {
        var senderId = GetUserId();
        if (senderId == null)
        {
            throw new HubException("User not authenticated");
        }

        var message = await _context.Messages.FindAsync(messageId);
        if (message == null)
        {
            throw new HubException("Message not found");
        }

        // Only sender can edit their own message
        if (message.SenderId != senderId)
        {
            throw new HubException("You can only edit your own messages");
        }

        // Cant edit deleted messages
        if (message.IsDeleted)
        {
            throw new HubException("Cannot edit a deleted message");
        }

        // Update message
        message.Content = newContent;
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var response = new
        {
            id = message.Id,
            content = message.Content,
            isEdited = message.IsEdited,
            editedAt = message.EditedAt,
        };

        // Notify receiver
        if (OnlineUsers.TryGetValue(message.ReceiverId, out var receiverConnections))
        {
            foreach (var connId in receiverConnections)
            {
                await Clients.Client(connId).SendAsync("MessageEdited", response);
            }
        }

        // Notify sender (for multiple devices)
        await Clients.Caller.SendAsync("MessageEdited", response);

        _logger.LogInformation("Message {MessageId} edited by {UserId}", messageId, senderId);
    }

    /// <summary>
    /// Delete your own message (soft delete).
    /// </summary>
    public async Task DeleteMessage(Guid messageId)
    {
        var senderId = GetUserId();
        if (senderId == null)
        {
            throw new HubException("User not authenticated");
        }

        var message = await _context.Messages.FindAsync(messageId);
        if (message == null)
        {
            throw new HubException("Message not found");
        }

        // Only sender can delete their own message
        if (message.SenderId != senderId)
        {
            throw new HubException("You can only delete your own messages");
        }

        // Soft delete
        message.IsDeleted = true;
        message.DeletedAt = DateTime.UtcNow;
        message.Content = "This message was deleted";

        await _context.SaveChangesAsync();

        var response = new
        {
            id = message.Id,
            isDeleted = true,
            deletedAt = message.DeletedAt,
        };

        // Notify receiver
        if (OnlineUsers.TryGetValue(message.ReceiverId, out var receiverConnections))
        {
            foreach (var connId in receiverConnections)
            {
                await Clients.Client(connId).SendAsync("MessageDeleted", response);
            }
        }

        // Notify sender
        await Clients.Caller.SendAsync("MessageDeleted", response);

        _logger.LogInformation("Message {MessageId} deleted by {UserId}", messageId, senderId);
    }
}
