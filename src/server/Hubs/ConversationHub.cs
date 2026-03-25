using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Hubs;

/// <summary>
/// Real-time hub for support conversations between customers and admins.
/// Handles messaging, typing indicators, read receipts, and status updates.
/// </summary>
[Authorize(Roles = Roles.Admin + "," + Roles.User)]
public class ConversationHub(
    DatabaseContext context,
    ILogger<ConversationHub> logger,
    INotificationService notificationService
) : Hub
{
    private readonly DatabaseContext _context = context;
    private readonly ILogger<ConversationHub> _logger = logger;
    private readonly INotificationService _notificationService = notificationService;

    // Tracks which users are actively viewing which conversations (userId -> set of conversationIds)
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, byte>> _userPresence = new();

    // Tracks connectionId -> userId for cleanup on disconnect
    private static readonly ConcurrentDictionary<string, string> _connectionUserMap = new();

    // Tracks connectionId -> set of joined conversationIds for cleanup on disconnect
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, byte>> _connectionConversations =
        new();

    private static string ConversationGroupName(Guid conversationId) => $"conversation-{conversationId}";

    private const string StaffGroupName = "staff";

    #region Response DTOs

    public record ConversationMessageResponse(
        Guid Id,
        Guid ConversationId,
        Guid ParticipantId,
        string SenderId,
        string SenderName,
        string Content,
        bool IsRead,
        DateTime? ReadAt,
        bool IsEdited,
        DateTime? EditedAt,
        bool IsDeleted,
        DateTime? DeletedAt,
        DateTime CreatedAt,
        Guid? ReplyToMessageId,
        string? ReplyToContent,
        string? ReplyToSenderName,
        // File attachment fields
        Guid? AssetId = null,
        string? FileUrl = null,
        string? FileName = null,
        string? FileType = null,
        long? FileSize = null,
        // Voice message fields
        string? VoiceMessageUrl = null,
        int? VoiceMessageDuration = null
    );

    public record ConversationAssignmentResponse(
        Guid ConversationId,
        string? AssignedToAdminId,
        string? AssignedToAdminName,
        string AssignedByUserId,
        string AssignedByUserName,
        DateTime AssignedAt
    );

    public record ConversationStatusResponse(
        Guid ConversationId,
        ConversationStatus Status,
        string UpdatedByUserId,
        string UpdatedByUserName,
        DateTime UpdatedAt
    );

    public record ConversationPriorityResponse(
        Guid ConversationId,
        ConversationPriority Priority,
        string UpdatedByUserId,
        string UpdatedByUserName,
        DateTime UpdatedAt
    );

    public record TypingIndicator(Guid ConversationId, string UserId, string UserName, bool IsAdmin);

    public record ReadReceiptResponse(Guid ConversationId, string ReaderId, List<Guid> MessageIds, DateTime ReadAt);

    #endregion

    #region Helpers

    private string? GetUserId()
    {
        return Context.UserIdentifier
            ?? Context.User?.FindFirst("sub")?.Value
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    private async Task<bool> IsAdminAsync(string userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.Role == Roles.Admin;
    }

    private async Task<bool> HasConversationAccessAsync(Guid conversationId, string userId, bool isAdmin)
    {
        var conversation = await _context.Conversations.FindAsync(conversationId);
        if (conversation == null)
            return false;

        // Admins can access all support mode conversations
        if (isAdmin && conversation.SupportMode)
            return true;

        // Check if user is the customer (owner) of this conversation
        if (conversation.CustomerId == userId)
            return true;

        // For peer-to-peer conversations, check participant membership
        if (!conversation.SupportMode)
        {
            return await _context.ConversationParticipants.AnyAsync(p =>
                p.ConversationId == conversationId && p.UserId == userId
            );
        }

        // For support conversations, only the customer (checked above) and admins have access.
        // Regular users who are somehow participants but not the customer are denied.
        return false;
    }

    private async Task<string> GetUserDisplayNameAsync(string userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.UserName ?? user?.Email ?? "Unknown";
    }

    /// <summary>
    /// Ensures the specified admin user is a participant in the conversation.
    /// Called when an admin joins a support mode conversation.
    /// </summary>
    private async Task EnsureAdminIsParticipantAsync(Guid conversationId, string adminUserId)
    {
        var existingParticipant = await _context.ConversationParticipants.FirstOrDefaultAsync(p =>
            p.ConversationId == conversationId && p.UserId == adminUserId
        );

        if (existingParticipant != null)
            return;

        try
        {
            _context.ConversationParticipants.Add(
                new ConversationParticipant
                {
                    ConversationId = conversationId,
                    UserId = adminUserId,
                    Role = ConversationParticipantRole.Admin,
                }
            );

            await _context.SaveChangesAsync();
            _logger.LogDebug(
                "[ConversationHub] Added admin {AdminUserId} to conversation {ConversationId}",
                adminUserId,
                conversationId
            );
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException)
        {
            // Clear the change tracker to remove the failed entity
            _context.ChangeTracker.Clear();

            // Participant was added by another request (race condition), ignore
            _logger.LogDebug(
                "[ConversationHub] Admin {AdminUserId} already a participant in conversation {ConversationId} (race condition)",
                adminUserId,
                conversationId
            );
        }
    }

    #endregion

    #region Connection Management

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            var isAdmin = await IsAdminAsync(userId);
            if (isAdmin)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, StaffGroupName);
                _logger.LogDebug("[ConversationHub] Added admin {UserId} to staff group", userId);
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        var connectionId = Context.ConnectionId;

        // Clean up presence tracking for this connection
        if (_connectionConversations.TryRemove(connectionId, out var conversationIds))
        {
            if (userId != null && _userPresence.TryGetValue(userId, out var userConversations))
            {
                foreach (var convId in conversationIds.Keys)
                {
                    userConversations.TryRemove(convId, out _);
                }

                // If user has no more active conversations, remove from presence map
                if (userConversations.IsEmpty)
                {
                    _userPresence.TryRemove(userId, out _);
                }
            }
        }

        _connectionUserMap.TryRemove(connectionId, out _);

        _logger.LogDebug("[ConversationHub] User {UserId} disconnected", userId);
        await base.OnDisconnectedAsync(exception);
    }

    #endregion

    #region Conversation Access

    /// <summary>
    /// Join a conversation to receive real-time updates.
    /// Admins are automatically added as participants when they join a support mode conversation
    /// and explicitly indicate they are joining as admin (asAdmin = true).
    /// </summary>
    /// <param name="conversationId">The conversation to join</param>
    /// <param name="asAdmin">Whether to join as admin. Only admins joining from admin context should pass true.</param>
    public async Task JoinConversation(Guid conversationId, bool asAdmin = false)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);

        // Only allow asAdmin=true if user actually has admin role
        var effectiveAsAdmin = asAdmin && isAdmin;

        if (!await HasConversationAccessAsync(conversationId, userId, effectiveAsAdmin))
            throw new HubException("Not authorized to join this conversation");

        // If admin joining a support conversation from admin context, add them as participant
        if (effectiveAsAdmin)
        {
            var conversation = await _context.Conversations.FindAsync(conversationId);
            if (conversation?.SupportMode == true)
            {
                await EnsureAdminIsParticipantAsync(conversationId, userId);
            }
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, ConversationGroupName(conversationId));

        // Track presence for this user and connection
        _connectionUserMap[Context.ConnectionId] = userId;
        var userConversations = _userPresence.GetOrAdd(userId, _ => new ConcurrentDictionary<Guid, byte>());
        userConversations[conversationId] = 0;
        var connectionConversations = _connectionConversations.GetOrAdd(
            Context.ConnectionId,
            _ => new ConcurrentDictionary<Guid, byte>()
        );
        connectionConversations[conversationId] = 0;

        _logger.LogDebug(
            "[ConversationHub] {UserId} joined conversation {ConversationId} (presence tracked)",
            userId,
            conversationId
        );
    }

    /// <summary>
    /// Leave a conversation to stop receiving real-time updates.
    /// </summary>
    public async Task LeaveConversation(Guid conversationId)
    {
        var userId = GetUserId();
        var connectionId = Context.ConnectionId;

        await Groups.RemoveFromGroupAsync(connectionId, ConversationGroupName(conversationId));

        // Remove presence tracking for this conversation
        if (_connectionConversations.TryGetValue(connectionId, out var connectionConversations))
        {
            connectionConversations.TryRemove(conversationId, out _);
        }

        if (userId != null && _userPresence.TryGetValue(userId, out var userConversations))
        {
            userConversations.TryRemove(conversationId, out _);
        }

        _logger.LogDebug(
            "[ConversationHub] {UserId} left conversation {ConversationId} (presence removed)",
            userId,
            conversationId
        );
    }

    /// <summary>
    /// Checks if a user is currently viewing a specific conversation.
    /// Used to suppress notifications when the user is already in the chat.
    /// </summary>
    private static bool IsUserInConversation(string userId, Guid conversationId)
    {
        return _userPresence.TryGetValue(userId, out var conversations) && conversations.ContainsKey(conversationId);
    }

    /// <summary>
    /// Notifies admins about a conversation event, but skips notification for admins
    /// who are already actively viewing the conversation.
    /// </summary>
    private async Task NotifyAdminsIfNotPresentAsync(
        Guid conversationId,
        NotificationType type,
        string title,
        string message
    )
    {
        var adminRoleId = await _context.Roles.Where(r => r.Name == "Admin").Select(r => r.Id).FirstOrDefaultAsync();

        if (adminRoleId == null)
        {
            _logger.LogWarning("[ConversationHub] Admin role not found");
            return;
        }

        var adminUserIds = await _context
            .UserRoles.Where(ur => ur.RoleId == adminRoleId)
            .Select(ur => ur.UserId)
            .ToListAsync();

        foreach (var adminId in adminUserIds)
        {
            if (IsUserInConversation(adminId, conversationId))
            {
                _logger.LogDebug(
                    "[ConversationHub] Skipping notification for admin {AdminId} - already in conversation {ConversationId}",
                    adminId,
                    conversationId
                );
                continue;
            }

            await _notificationService.CreateNotificationAsync(
                adminId,
                type,
                title,
                message,
                conversationId,
                null,
                NotificationPriority.Normal,
                $"/chat?conversation={conversationId}"
            );
        }
    }

    #endregion

    #region Messaging

    /// <summary>
    /// Send a message in a conversation. Supports reply-to for quoting previous messages.
    /// </summary>
    public async Task SendMessage(Guid conversationId, string content, Guid? replyToMessageId = null)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        if (string.IsNullOrWhiteSpace(content))
            throw new HubException("Message cannot be empty");

        var isAdmin = await IsAdminAsync(userId);
        if (!await HasConversationAccessAsync(conversationId, userId, isAdmin))
            throw new HubException("Not authorized to send messages in this conversation");

        var conversation = await _context
            .Conversations.Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation is null)
            throw new HubException("Conversation not found");

        // Get or create participant record for the sender
        // First, check if participant already exists in the database
        var participant = await _context.ConversationParticipants.FirstOrDefaultAsync(p =>
            p.ConversationId == conversationId && p.UserId == userId
        );

        if (participant is null)
        {
            try
            {
                participant = new ConversationParticipant
                {
                    ConversationId = conversationId,
                    UserId = userId,
                    Role = isAdmin ? ConversationParticipantRole.Admin : ConversationParticipantRole.Member,
                };
                _context.ConversationParticipants.Add(participant);
                await _context.SaveChangesAsync();
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                // Participant was added by another request (race condition), fetch it
                participant = await _context.ConversationParticipants.FirstOrDefaultAsync(p =>
                    p.ConversationId == conversationId && p.UserId == userId
                );
                if (participant is null)
                    throw new HubException("Failed to create participant record");
            }
        }

        // Handle reply-to message
        ConversationMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .ConversationMessages.Include(m => m.Participant)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value && m.ConversationId == conversationId);
        }

        // Create the message
        var message = new ConversationMessage
        {
            ConversationId = conversationId,
            ParticipantId = participant.Id,
            Content = content.Trim(),
            IsRead = false,
            ReplyToMessageId = replyToMessage?.Id,
        };

        _context.ConversationMessages.Add(message);

        // Update conversation metadata
        conversation.LastMessageAt = DateTime.UtcNow;
        if (!isAdmin)
        {
            conversation.UnreadCount++;
        }

        // Auto-activate pending conversations when admin replies
        if (isAdmin && conversation.Status == ConversationStatus.Pending)
        {
            conversation.Status = ConversationStatus.Active;
        }

        await _context.SaveChangesAsync();

        // Build response
        var senderName = await GetUserDisplayNameAsync(userId);

        var response = new ConversationMessageResponse(
            message.Id,
            message.ConversationId,
            message.ParticipantId,
            userId,
            senderName,
            message.Content,
            message.IsRead,
            message.ReadAt,
            message.IsEdited,
            message.EditedAt,
            message.IsDeleted,
            message.DeletedAt,
            message.CreatedAt,
            message.ReplyToMessageId,
            replyToMessage?.Content,
            replyToMessage != null
                ? replyToMessage.Participant.User.UserName ?? replyToMessage.Participant.User.Email ?? "Unknown"
                : null,
            null, // AssetId
            null, // FileUrl
            null, // FileName
            null, // FileType
            null, // FileSize
            null, // VoiceMessageUrl
            null // VoiceMessageDuration
        );

        // Broadcast to all participants in the conversation
        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationMessageReceived", response);

        // Notify staff inbox when customer sends a message
        if (!isAdmin)
        {
            await Clients
                .Group(StaffGroupName)
                .SendAsync(
                    "ConversationUpdated",
                    new
                    {
                        conversationId,
                        triggeredBy = userId,
                        lastMessageAt = conversation.LastMessageAt,
                    }
                );

            // Send push notification to admins (don't fail message send if notification fails)
            // Skip if admins are already viewing the conversation
            try
            {
                await NotifyAdminsIfNotPresentAsync(
                    conversationId,
                    NotificationType.NewMessage,
                    "New Customer Message",
                    $"{senderName} sent a message: {(content.Length > 50 ? content[..50] + "..." : content)}"
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "[ConversationHub] Failed to send admin notification for message in conversation {ConversationId}",
                    conversationId
                );
            }
        }
        else
        {
            // Admin replied, notify the customer if they're not already viewing the conversation
            if (!IsUserInConversation(conversation.CustomerId, conversationId))
            {
                try
                {
                    _logger.LogDebug(
                        "[ConversationHub] Creating notification for CustomerId: {CustomerId}, ConversationId: {ConversationId}",
                        conversation.CustomerId,
                        conversationId
                    );
                    await _notificationService.CreateNotificationAsync(
                        conversation.CustomerId,
                        NotificationType.NewMessage,
                        "New Reply from Support",
                        $"{senderName} replied to your conversation",
                        conversationId,
                        message.Id,
                        NotificationPriority.Normal,
                        $"/support?conversation={conversationId}"
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "[ConversationHub] Failed to send customer notification for message in conversation {ConversationId}",
                        conversationId
                    );
                }
            }
            else
            {
                _logger.LogDebug(
                    "[ConversationHub] Skipping notification for CustomerId: {CustomerId} - already in conversation {ConversationId}",
                    conversation.CustomerId,
                    conversationId
                );
            }
        }

        _logger.LogDebug(
            "[ConversationHub] Message sent in conversation {ConversationId} by {UserId}",
            conversationId,
            userId
        );
    }

    /// <summary>
    /// Send a message with a file attachment.
    /// File must be uploaded first via the upload-file endpoint to get the assetId.
    /// </summary>
    public async Task SendMessageWithFile(
        Guid conversationId,
        string content,
        Guid assetId,
        string fileUrl,
        string fileName,
        string fileType,
        long fileSize,
        Guid? replyToMessageId = null
    )
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!await HasConversationAccessAsync(conversationId, userId, isAdmin))
            throw new HubException("Not authorized to send messages in this conversation");

        var conversation = await _context
            .Conversations.Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation is null)
            throw new HubException("Conversation not found");

        // Get or create participant record for the sender
        var participant = await _context.ConversationParticipants.FirstOrDefaultAsync(p =>
            p.ConversationId == conversationId && p.UserId == userId
        );

        if (participant is null)
        {
            try
            {
                participant = new ConversationParticipant
                {
                    ConversationId = conversationId,
                    UserId = userId,
                    Role = isAdmin ? ConversationParticipantRole.Admin : ConversationParticipantRole.Member,
                };
                _context.ConversationParticipants.Add(participant);
                await _context.SaveChangesAsync();
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                // Clear the change tracker to remove the failed entity
                _context.ChangeTracker.Clear();

                // Participant was added by another request (race condition), fetch it
                participant = await _context.ConversationParticipants.FirstOrDefaultAsync(p =>
                    p.ConversationId == conversationId && p.UserId == userId
                );
                if (participant is null)
                    throw new HubException("Failed to create participant record");

                // Re-fetch conversation since we cleared the tracker
                conversation = await _context
                    .Conversations.Include(c => c.Participants)
                    .FirstOrDefaultAsync(c => c.Id == conversationId);
                if (conversation is null)
                    throw new HubException("Conversation not found");
            }
        }

        // Handle reply-to message
        ConversationMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .ConversationMessages.Include(m => m.Participant)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value && m.ConversationId == conversationId);
        }

        // Create the message with file attachment
        var message = new ConversationMessage
        {
            ConversationId = conversationId,
            ParticipantId = participant.Id,
            Content = string.IsNullOrWhiteSpace(content) ? $"📎 {fileName}" : content.Trim(),
            IsRead = false,
            ReplyToMessageId = replyToMessage?.Id,
            AssetId = assetId,
            FileUrl = fileUrl,
            FileName = fileName,
            FileType = fileType,
            FileSize = fileSize,
        };

        _context.ConversationMessages.Add(message);
        conversation.LastMessageAt = DateTime.UtcNow;
        if (!isAdmin)
        {
            conversation.UnreadCount++;
        }

        if (isAdmin && conversation.Status == ConversationStatus.Pending)
        {
            conversation.Status = ConversationStatus.Active;
        }

        await _context.SaveChangesAsync();

        var senderName = await GetUserDisplayNameAsync(userId);

        var response = new ConversationMessageResponse(
            message.Id,
            message.ConversationId,
            message.ParticipantId,
            userId,
            senderName,
            message.Content,
            message.IsRead,
            message.ReadAt,
            message.IsEdited,
            message.EditedAt,
            message.IsDeleted,
            message.DeletedAt,
            message.CreatedAt,
            message.ReplyToMessageId,
            replyToMessage?.Content,
            replyToMessage != null
                ? replyToMessage.Participant.User.UserName ?? replyToMessage.Participant.User.Email ?? "Unknown"
                : null,
            message.AssetId,
            message.FileUrl,
            message.FileName,
            message.FileType,
            message.FileSize
        );

        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationMessageReceived", response);

        if (!isAdmin)
        {
            await Clients
                .Group(StaffGroupName)
                .SendAsync(
                    "ConversationUpdated",
                    new
                    {
                        conversationId,
                        triggeredBy = userId,
                        lastMessageAt = conversation.LastMessageAt,
                    }
                );

            try
            {
                await NotifyAdminsIfNotPresentAsync(
                    conversationId,
                    NotificationType.NewMessage,
                    "New File Attachment",
                    $"{senderName} sent a file: {fileName}"
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "[ConversationHub] Failed to send admin notification for file message in conversation {ConversationId}",
                    conversationId
                );
            }
        }
        else
        {
            if (!IsUserInConversation(conversation.CustomerId, conversationId))
            {
                try
                {
                    await _notificationService.CreateNotificationAsync(
                        conversation.CustomerId,
                        NotificationType.NewMessage,
                        "New File from Support",
                        $"{senderName} sent a file: {fileName}",
                        conversationId,
                        message.Id,
                        NotificationPriority.Normal,
                        $"/chat?conversation={conversationId}"
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "[ConversationHub] Failed to send customer notification for file message in conversation {ConversationId}",
                        conversationId
                    );
                }
            }
        }

        _logger.LogDebug(
            "[ConversationHub] File message sent in conversation {ConversationId} by {UserId}",
            conversationId,
            userId
        );
    }

    /// <summary>
    /// Send a voice message. Voice file must be uploaded first via the upload-voice endpoint.
    /// </summary>
    public async Task SendVoiceMessage(
        Guid conversationId,
        Guid assetId,
        string voiceUrl,
        int duration,
        Guid? replyToMessageId = null
    )
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!await HasConversationAccessAsync(conversationId, userId, isAdmin))
            throw new HubException("Not authorized to send messages in this conversation");

        var conversation = await _context
            .Conversations.Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation is null)
            throw new HubException("Conversation not found");

        // Get or create participant record for the sender
        var participant = await _context.ConversationParticipants.FirstOrDefaultAsync(p =>
            p.ConversationId == conversationId && p.UserId == userId
        );

        if (participant is null)
        {
            try
            {
                participant = new ConversationParticipant
                {
                    ConversationId = conversationId,
                    UserId = userId,
                    Role = isAdmin ? ConversationParticipantRole.Admin : ConversationParticipantRole.Member,
                };
                _context.ConversationParticipants.Add(participant);
                await _context.SaveChangesAsync();
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                // Clear the change tracker to remove the failed entity
                _context.ChangeTracker.Clear();

                // Participant was added by another request (race condition), fetch it
                participant = await _context.ConversationParticipants.FirstOrDefaultAsync(p =>
                    p.ConversationId == conversationId && p.UserId == userId
                );
                if (participant is null)
                    throw new HubException("Failed to create participant record");

                // Re-fetch conversation since we cleared the tracker
                conversation = await _context
                    .Conversations.Include(c => c.Participants)
                    .FirstOrDefaultAsync(c => c.Id == conversationId);
                if (conversation is null)
                    throw new HubException("Conversation not found");
            }
        }

        ConversationMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .ConversationMessages.Include(m => m.Participant)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value && m.ConversationId == conversationId);
        }

        // Create voice message
        var message = new ConversationMessage
        {
            ConversationId = conversationId,
            ParticipantId = participant.Id,
            Content = $"🎤 Voice message ({FormatDuration(duration)})",
            IsRead = false,
            ReplyToMessageId = replyToMessage?.Id,
            AssetId = assetId,
            VoiceMessageUrl = voiceUrl,
            VoiceMessageDuration = duration,
        };

        _context.ConversationMessages.Add(message);
        conversation.LastMessageAt = DateTime.UtcNow;
        if (!isAdmin)
        {
            conversation.UnreadCount++;
        }

        if (isAdmin && conversation.Status == ConversationStatus.Pending)
        {
            conversation.Status = ConversationStatus.Active;
        }

        await _context.SaveChangesAsync();

        var senderName = await GetUserDisplayNameAsync(userId);

        var response = new ConversationMessageResponse(
            message.Id,
            message.ConversationId,
            message.ParticipantId,
            userId,
            senderName,
            message.Content,
            message.IsRead,
            message.ReadAt,
            message.IsEdited,
            message.EditedAt,
            message.IsDeleted,
            message.DeletedAt,
            message.CreatedAt,
            message.ReplyToMessageId,
            replyToMessage?.Content,
            replyToMessage != null
                ? replyToMessage.Participant.User.UserName ?? replyToMessage.Participant.User.Email ?? "Unknown"
                : null,
            VoiceMessageUrl: message.VoiceMessageUrl,
            VoiceMessageDuration: message.VoiceMessageDuration
        );

        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationMessageReceived", response);

        if (!isAdmin)
        {
            await Clients
                .Group(StaffGroupName)
                .SendAsync(
                    "ConversationUpdated",
                    new
                    {
                        conversationId,
                        triggeredBy = userId,
                        lastMessageAt = conversation.LastMessageAt,
                    }
                );

            try
            {
                await NotifyAdminsIfNotPresentAsync(
                    conversationId,
                    NotificationType.NewMessage,
                    "New Voice Message",
                    $"{senderName} sent a voice message ({FormatDuration(duration)})"
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "[ConversationHub] Failed to send admin notification for voice message in conversation {ConversationId}",
                    conversationId
                );
            }
        }
        else
        {
            if (!IsUserInConversation(conversation.CustomerId, conversationId))
            {
                try
                {
                    await _notificationService.CreateNotificationAsync(
                        conversation.CustomerId,
                        NotificationType.NewMessage,
                        "New Voice Message from Support",
                        $"{senderName} sent a voice message ({FormatDuration(duration)})",
                        conversationId,
                        message.Id,
                        NotificationPriority.Normal,
                        $"/chat?conversation={conversationId}"
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "[ConversationHub] Failed to send customer notification for voice message in conversation {ConversationId}",
                        conversationId
                    );
                }
            }
        }

        _logger.LogDebug(
            "[ConversationHub] Voice message sent in conversation {ConversationId} by {UserId}",
            conversationId,
            userId
        );
    }

    private static string FormatDuration(int seconds)
    {
        var minutes = seconds / 60;
        var secs = seconds % 60;
        return $"{minutes}:{secs:D2}";
    }

    /// <summary>
    /// Assign or unassign a conversation to an admin. Admin only.
    /// </summary>
    public async Task AssignConversation(Guid conversationId, string? adminId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin)
            throw new HubException("Only admins can assign conversations");

        var conversation = await _context
            .Conversations.Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation is null)
            throw new HubException("Conversation not found");

        // Validate admin exists if assigning
        string? assignedAdminName = null;
        if (!string.IsNullOrEmpty(adminId))
        {
            var targetAdmin = await _context.Users.FindAsync(adminId);
            if (targetAdmin is null || targetAdmin.Role != Roles.Admin)
                throw new HubException("Invalid admin user");

            assignedAdminName = targetAdmin.UserName ?? targetAdmin.Email ?? "Unknown";
        }

        conversation.AssignedToAdminId = adminId;
        await _context.SaveChangesAsync();

        var assignerName = await GetUserDisplayNameAsync(userId);

        var response = new ConversationAssignmentResponse(
            conversationId,
            adminId,
            assignedAdminName,
            userId,
            assignerName,
            DateTime.UtcNow
        );

        // Broadcast to conversation participants and staff
        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationAssignmentUpdated", response);
        await Clients.Group(StaffGroupName).SendAsync("ConversationAssignmentUpdated", response);

        // Notify assigned admin if different from current user
        if (!string.IsNullOrEmpty(adminId) && adminId != userId)
        {
            var customerName = conversation.Customer.UserName ?? conversation.Customer.Email ?? "Unknown";
            await _notificationService.CreateNotificationAsync(
                adminId,
                NotificationType.ConversationAssigned,
                "Conversation Assigned",
                $"{assignerName} assigned you to {customerName}'s conversation",
                conversationId,
                null,
                NotificationPriority.Normal,
                $"/admin/chat?conversation={conversationId}"
            );
        }

        _logger.LogInformation(
            "[ConversationHub] Conversation {ConversationId} assigned to {AdminId} by {UserId}",
            conversationId,
            adminId ?? "unassigned",
            userId
        );
    }

    /// <summary>
    /// Edit a message you previously sent. Only the sender can edit their own messages.
    /// </summary>
    public async Task EditMessage(Guid messageId, string newContent)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        if (string.IsNullOrWhiteSpace(newContent))
            throw new HubException("Message cannot be empty");

        var message = await _context
            .ConversationMessages.Include(m => m.Participant)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message is null)
            throw new HubException("Message not found");

        if (message.Participant.UserId != userId)
            throw new HubException("You can only edit your own messages");

        if (message.IsDeleted)
            throw new HubException("Cannot edit a deleted message");

        message.Content = newContent.Trim();
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await Clients
            .Group(ConversationGroupName(message.ConversationId))
            .SendAsync(
                "ConversationMessageEdited",
                new
                {
                    id = message.Id,
                    conversationId = message.ConversationId,
                    content = message.Content,
                    isEdited = message.IsEdited,
                    editedAt = message.EditedAt,
                }
            );

        _logger.LogDebug("[ConversationHub] Message {MessageId} edited by {UserId}", messageId, userId);
    }

    /// <summary>
    /// Delete a message you previously sent. This is a soft delete,
    /// the message content is replaced with a placeholder.
    /// </summary>
    public async Task DeleteMessage(Guid messageId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var message = await _context
            .ConversationMessages.Include(m => m.Participant)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message is null)
            throw new HubException("Message not found");

        if (message.Participant.UserId != userId)
            throw new HubException("You can only delete your own messages");

        if (message.IsDeleted)
            throw new HubException("Message is already deleted");

        message.IsDeleted = true;
        message.DeletedAt = DateTime.UtcNow;
        message.Content = "This message was deleted";

        await _context.SaveChangesAsync();

        await Clients
            .Group(ConversationGroupName(message.ConversationId))
            .SendAsync(
                "ConversationMessageDeleted",
                new
                {
                    id = message.Id,
                    conversationId = message.ConversationId,
                    isDeleted = true,
                    deletedAt = message.DeletedAt,
                }
            );

        _logger.LogDebug("[ConversationHub] Message {MessageId} deleted by {UserId}", messageId, userId);
    }

    #endregion

    #region Read Receipts

    /// <summary>
    /// Mark all unread messages in a conversation as read.
    /// Broadcasts the read receipt to all participants so they see the double check marks.
    /// </summary>
    public async Task MarkConversationRead(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!await HasConversationAccessAsync(conversationId, userId, isAdmin))
            throw new HubException("Not authorized to mark read");

        // Find messages sent by others that haven't been read yet
        var unreadMessages = await _context
            .ConversationMessages.Where(m =>
                m.ConversationId == conversationId && m.Participant.UserId != userId && !m.IsRead
            )
            .ToListAsync();

        if (unreadMessages.Count == 0)
            return;

        var now = DateTime.UtcNow;
        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
            message.ReadAt = now;
        }

        // If admin is reading, reset the unread count
        if (isAdmin)
        {
            var conversation = await _context.Conversations.FindAsync(conversationId);
            if (conversation != null)
            {
                conversation.UnreadCount = 0;
            }
        }

        await _context.SaveChangesAsync();

        var response = new ReadReceiptResponse(conversationId, userId, unreadMessages.Select(m => m.Id).ToList(), now);

        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationMessagesRead", response);

        _logger.LogDebug(
            "[ConversationHub] {UserId} marked {Count} messages as read in {ConversationId}",
            userId,
            unreadMessages.Count,
            conversationId
        );
    }

    #endregion

    #region Typing Indicators

    /// <summary>
    /// Broadcast that the user started typing. This is an ephemeral event,
    /// not persisted to the database.
    /// </summary>
    public async Task StartTyping(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        var userName = await GetUserDisplayNameAsync(userId);

        var indicator = new TypingIndicator(conversationId, userId, userName, isAdmin);

        // Broadcast to everyone in the conversation except the sender
        await Clients
            .GroupExcept(ConversationGroupName(conversationId), Context.ConnectionId)
            .SendAsync("UserStartedTyping", indicator);

        // Also notify staff inbox if a customer is typing
        if (!isAdmin)
        {
            await Clients.Group(StaffGroupName).SendAsync("UserStartedTyping", indicator);
        }
    }

    /// <summary>
    /// Broadcast that the user stopped typing. This is an ephemeral event,
    /// not persisted to the database.
    /// </summary>
    public async Task StopTyping(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);

        var indicator = new TypingIndicator(conversationId, userId, "", isAdmin);

        await Clients
            .GroupExcept(ConversationGroupName(conversationId), Context.ConnectionId)
            .SendAsync("UserStoppedTyping", indicator);

        if (!isAdmin)
        {
            await Clients.Group(StaffGroupName).SendAsync("UserStoppedTyping", indicator);
        }
    }

    #endregion

    #region Status and Priority Management (Admin Only)

    /// <summary>
    /// Update the status of a conversation. Only admins can do this.
    /// Status changes are broadcast in real-time to all participants.
    /// </summary>
    public async Task UpdateConversationStatus(Guid conversationId, ConversationStatus newStatus)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin)
            throw new HubException("Only admins can update conversation status");

        var conversation = await _context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            throw new HubException("Conversation not found");

        var oldStatus = conversation.Status;
        conversation.Status = newStatus;

        await _context.SaveChangesAsync();

        var userName = await GetUserDisplayNameAsync(userId);

        var response = new ConversationStatusResponse(conversationId, newStatus, userId, userName, DateTime.UtcNow);

        // Broadcast to all participants
        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationStatusUpdated", response);

        // Notify staff inbox
        await Clients.Group(StaffGroupName).SendAsync("ConversationStatusUpdated", response);

        // Notify customer of status change
        var statusText = newStatus switch
        {
            ConversationStatus.Active => "active",
            ConversationStatus.Resolved => "resolved",
            ConversationStatus.Closed => "closed",
            _ => "updated",
        };

        var notificationTitle = newStatus switch
        {
            ConversationStatus.Active => "Conversation In Progress",
            ConversationStatus.Resolved => "Conversation Resolved",
            ConversationStatus.Closed => "Conversation Closed",
            _ => "Conversation Status Updated",
        };

        await _notificationService.CreateNotificationAsync(
            conversation.CustomerId,
            NotificationType.ConversationStatusChanged,
            notificationTitle,
            $"Your support conversation has been marked as {statusText}",
            conversationId,
            null,
            NotificationPriority.Normal,
            $"/chat?conversation={conversationId}"
        );

        _logger.LogInformation(
            "[ConversationHub] Conversation {ConversationId} status changed from {OldStatus} to {NewStatus} by {UserId}",
            conversationId,
            oldStatus,
            newStatus,
            userId
        );
    }

    /// <summary>
    /// Update the priority of a conversation. Only admins can do this.
    /// Priority changes are broadcast in real-time to all participants.
    /// </summary>
    public async Task UpdateConversationPriority(Guid conversationId, ConversationPriority newPriority)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin)
            throw new HubException("Only admins can update conversation priority");

        var conversation = await _context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            throw new HubException("Conversation not found");

        var oldPriority = conversation.Priority;
        conversation.Priority = newPriority;

        await _context.SaveChangesAsync();

        var userName = await GetUserDisplayNameAsync(userId);

        var response = new ConversationPriorityResponse(conversationId, newPriority, userId, userName, DateTime.UtcNow);

        // Broadcast to all participants
        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationPriorityUpdated", response);

        // Notify staff inbox
        await Clients.Group(StaffGroupName).SendAsync("ConversationPriorityUpdated", response);

        // Notify customer of priority change (especially important for escalations)
        var priorityText = newPriority switch
        {
            ConversationPriority.Low => "low",
            ConversationPriority.Normal => "normal",
            ConversationPriority.High => "high",
            ConversationPriority.Urgent => "urgent",
        };

        var notificationPriority =
            newPriority >= ConversationPriority.High ? NotificationPriority.High : NotificationPriority.Normal;

        var notificationTitle =
            newPriority >= ConversationPriority.High ? "Conversation Escalated" : "Priority Updated";

        await _notificationService.CreateNotificationAsync(
            conversation.CustomerId,
            NotificationType.ConversationPriorityChanged,
            notificationTitle,
            $"Your support conversation priority has been set to {priorityText}",
            conversationId,
            null,
            notificationPriority,
            $"/chat?conversation={conversationId}"
        );

        _logger.LogInformation(
            "[ConversationHub] Conversation {ConversationId} priority changed from {OldPriority} to {NewPriority} by {UserId}",
            conversationId,
            oldPriority,
            newPriority,
            userId
        );
    }

    #endregion

    #region Calling

    /// <summary>
    /// Initiates a voice or video call in a conversation.
    /// Creates a call log, notifies all participants, and returns the call ID.
    /// </summary>
    public async Task<Guid> InitiateCall(Guid conversationId, CallType callType)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!await HasConversationAccessAsync(conversationId, userId, isAdmin))
            throw new HubException("Not authorized to initiate call in this conversation");

        var participants = await _context
            .ConversationParticipants.Where(p => p.ConversationId == conversationId)
            .ToListAsync();

        var roomName = $"call-{Guid.NewGuid()}";
        var callLogId = Guid.NewGuid();

        var callLog = new CallLog
        {
            Id = callLogId,
            ConversationId = conversationId,
            InitiatorId = userId,
            Type = callType,
            Status = CallStatus.Ongoing, // Start as ongoing since initiator auto-joins
            StartedAt = DateTime.UtcNow,
            LiveKitRoomName = roomName,
            Participants = participants
                .Select(p => new CallParticipant
                {
                    Id = Guid.NewGuid(),
                    CallLogId = callLogId,
                    UserId = p.UserId,
                    DidAnswer = p.UserId == userId,
                    JoinedAt = p.UserId == userId ? DateTime.UtcNow : null,
                })
                .ToList(),
        };

        _context.CallLogs.Add(callLog);

        var initiatorParticipant = participants.FirstOrDefault(p => p.UserId == userId);
        ConversationMessage? callMessage = null;
        if (initiatorParticipant is not null)
        {
            callMessage = new ConversationMessage
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                ParticipantId = initiatorParticipant.Id,
                Content = callType == CallType.Audio ? "Voice call" : "Video call",
                IsCallMessage = true,
                CallLogId = callLog.Id,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
            };

            _context.ConversationMessages.Add(callMessage);

            var conversation = await _context.Conversations.FindAsync(conversationId);
            if (conversation is not null)
            {
                conversation.LastMessageAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        var initiatorName = await GetUserDisplayNameAsync(userId);

        // Broadcast the call message to all participants
        if (callMessage is not null)
        {
            await Clients
                .Group(ConversationGroupName(conversationId))
                .SendAsync(
                    "ConversationMessageReceived",
                    new
                    {
                        callMessage.Id,
                        callMessage.ConversationId,
                        callMessage.ParticipantId,
                        SenderId = userId,
                        SenderName = initiatorName,
                        callMessage.Content,
                        callMessage.IsRead,
                        ReadAt = (DateTime?)null,
                        callMessage.IsEdited,
                        EditedAt = (DateTime?)null,
                        callMessage.IsDeleted,
                        DeletedAt = (DateTime?)null,
                        callMessage.CreatedAt,
                        ReplyToMessageId = (Guid?)null,
                        ReplyToContent = (string?)null,
                        ReplyToSenderName = (string?)null,
                        FileUrl = (string?)null,
                        FileName = (string?)null,
                        FileType = (string?)null,
                        FileSize = (int?)null,
                        VoiceMessageUrl = (string?)null,
                        VoiceMessageDuration = (int?)null,
                        callMessage.IsCallMessage,
                        callMessage.CallLogId,
                    }
                );
        }

        var incomingCallPayload = new
        {
            CallId = callLog.Id,
            ConversationId = conversationId,
            InitiatorId = userId,
            InitiatorName = initiatorName,
            CallType = callType,
            RoomName = roomName,
            Status = CallStatus.Ringing,
        };

        // Send to conversation group
        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("IncomingCall", incomingCallPayload);

        // Also send directly to all participants (in case they haven't joined the group yet)
        var participantUserIds = participants.Select(p => p.UserId).Where(id => id != userId).ToList();
        if (participantUserIds.Count > 0)
        {
            await Clients.Users(participantUserIds).SendAsync("IncomingCall", incomingCallPayload);
        }

        _logger.LogInformation(
            "[ConversationHub] Call initiated by {UserId} in conversation {ConversationId}, callId: {CallId}",
            userId,
            conversationId,
            callLogId
        );

        return callLogId;
    }

    /// <summary>
    /// Answers an incoming call and marks the participant as joined.
    /// </summary>
    public async Task AnswerCall(Guid callId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var callLog = await _context.CallLogs.Include(c => c.Participants).FirstOrDefaultAsync(c => c.Id == callId);

        if (callLog is null)
            throw new HubException("Call not found");

        var participant = callLog.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant is null)
            throw new HubException("Not a participant in this call");

        participant.DidAnswer = true;
        participant.JoinedAt = DateTime.UtcNow;

        if (callLog.Status == CallStatus.Ringing)
        {
            callLog.Status = CallStatus.Ongoing;
        }

        await _context.SaveChangesAsync();

        var userName = await GetUserDisplayNameAsync(userId);

        await Clients
            .Group(ConversationGroupName(callLog.ConversationId))
            .SendAsync(
                "UserJoinedCall",
                new
                {
                    CallId = callId,
                    UserId = userId,
                    UserName = userName,
                    JoinedAt = participant.JoinedAt,
                }
            );

        _logger.LogInformation("[ConversationHub] User {UserId} answered call {CallId}", userId, callId);
    }

    /// <summary>
    /// Declines an incoming call. If all non-initiator participants decline, marks call as Declined.
    /// </summary>
    public async Task DeclineCall(Guid callId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var callLog = await _context
            .CallLogs.Include(c => c.Participants)
            .Include(c => c.Conversation)
                .ThenInclude(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == callId);

        if (callLog is null)
            throw new HubException("Call not found");

        var participant = callLog.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant is null)
            throw new HubException("Not a participant in this call");

        var allDeclined = callLog.Participants.Where(p => p.UserId != callLog.InitiatorId).All(p => !p.DidAnswer);

        if (userId == callLog.InitiatorId || allDeclined)
        {
            callLog.Status = CallStatus.Declined;
            callLog.EndedAt = DateTime.UtcNow;

            var callMessage = callLog.Conversation.Messages.FirstOrDefault(m => m.CallLogId == callId);
            if (callMessage is not null)
            {
                callMessage.Content =
                    callLog.Type == CallType.Audio ? "Voice call • Declined" : "Video call • Declined";

                // Broadcast the updated call message
                await Clients
                    .Group(ConversationGroupName(callLog.ConversationId))
                    .SendAsync(
                        "ConversationMessageEdited",
                        new
                        {
                            Id = callMessage.Id,
                            ConversationId = callLog.ConversationId,
                            Content = callMessage.Content,
                            IsEdited = false,
                            EditedAt = (DateTime?)null,
                        }
                    );
            }
        }

        await _context.SaveChangesAsync();

        await Clients
            .Group(ConversationGroupName(callLog.ConversationId))
            .SendAsync(
                "CallDeclined",
                new
                {
                    CallId = callId,
                    UserId = userId,
                    Status = callLog.Status,
                }
            );

        _logger.LogInformation("[ConversationHub] User {UserId} declined call {CallId}", userId, callId);
    }

    /// <summary>
    /// Ends a call or leaves the call. If all participants have left or initiator leaves,
    /// marks the call as completed and calculates duration.
    /// </summary>
    public async Task EndCall(Guid callId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var callLog = await _context
            .CallLogs.Include(c => c.Participants)
            .Include(c => c.Conversation)
                .ThenInclude(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == callId);

        if (callLog is null)
            throw new HubException("Call not found");

        var participant = callLog.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant is null)
            throw new HubException("Not a participant in this call");

        participant.LeftAt = DateTime.UtcNow;

        var allLeft = callLog.Participants.All(p => p.LeftAt != null);
        var initiatorLeft = userId == callLog.InitiatorId;

        if (allLeft || initiatorLeft)
        {
            callLog.EndedAt = DateTime.UtcNow;

            var firstAnswer = callLog
                .Participants.Where(p => p.JoinedAt != null)
                .OrderBy(p => p.JoinedAt)
                .FirstOrDefault();

            if (firstAnswer?.JoinedAt != null)
            {
                callLog.DurationSeconds = (int)(callLog.EndedAt.Value - firstAnswer.JoinedAt.Value).TotalSeconds;
                callLog.Status = CallStatus.Completed;
            }
            else
            {
                callLog.Status = CallStatus.Missed;
                callLog.DurationSeconds = null;
            }

            var callMessage = callLog.Conversation.Messages.FirstOrDefault(m => m.CallLogId == callId);

            if (callMessage is not null)
            {
                string statusText;
                if (callLog.Status == CallStatus.Missed)
                {
                    statusText = "Missed";
                }
                else if (callLog.DurationSeconds.HasValue)
                {
                    var minutes = callLog.DurationSeconds.Value / 60;
                    var seconds = callLog.DurationSeconds.Value % 60;
                    statusText = $"{minutes}m {seconds}s";
                }
                else
                {
                    statusText = "Ended";
                }

                callMessage.Content =
                    callLog.Type == CallType.Audio ? $"Voice call • {statusText}" : $"Video call • {statusText}";

                // Broadcast the updated call message
                var initiatorName = await GetUserDisplayNameAsync(callLog.InitiatorId);
                await Clients
                    .Group(ConversationGroupName(callLog.ConversationId))
                    .SendAsync(
                        "ConversationMessageEdited",
                        new
                        {
                            Id = callMessage.Id,
                            ConversationId = callLog.ConversationId,
                            Content = callMessage.Content,
                            IsEdited = false, // Not a user edit
                            EditedAt = (DateTime?)null,
                        }
                    );
            }
        }

        await _context.SaveChangesAsync();

        var userName = await GetUserDisplayNameAsync(userId);

        await Clients
            .Group(ConversationGroupName(callLog.ConversationId))
            .SendAsync(
                "UserLeftCall",
                new
                {
                    CallId = callId,
                    UserId = userId,
                    UserName = userName,
                    LeftAt = participant.LeftAt,
                }
            );

        if (callLog.EndedAt != null)
        {
            await Clients
                .Group(ConversationGroupName(callLog.ConversationId))
                .SendAsync(
                    "CallEnded",
                    new
                    {
                        CallId = callId,
                        Duration = callLog.DurationSeconds,
                        Status = callLog.Status,
                    }
                );
        }

        _logger.LogInformation("[ConversationHub] User {UserId} left call {CallId}", userId, callId);
    }

    #endregion
}
