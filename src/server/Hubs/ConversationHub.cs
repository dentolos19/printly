using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Hubs;

[Authorize(Roles = Roles.Admin + "," + Roles.User)]
public class ConversationHub(DatabaseContext context, ILogger<ConversationHub> logger) : Hub
{
    private readonly DatabaseContext _context = context;
    private readonly ILogger<ConversationHub> _logger = logger;

    private static string ConversationGroupName(Guid conversationId) => $"conversation-{conversationId}";

    private const string StaffGroupName = "staff";

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
        string? ReplyToSenderName
    );

    private string? GetUserId()
    {
        return Context.UserIdentifier
            ?? Context.User?.FindFirst("sub")?.Value
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    private Task<bool> IsAdminAsync(string userId)
    {
        return _context
            .UserRoles.Where(ur => ur.UserId == userId)
            .Join(_context.Roles, ur => ur.RoleId, role => role.Id, (_, role) => role.Name)
            .AnyAsync(name => name == Roles.Admin);
    }

    private async Task<bool> HasConversationAccessAsync(Guid conversationId, string userId, bool isAdmin)
    {
        if (isAdmin)
            return true;

        return await _context.ConversationParticipants.AnyAsync(p =>
            p.ConversationId == conversationId && p.UserId == userId
        );
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId) && await IsAdminAsync(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, StaffGroupName);
            _logger.LogDebug("[ConversationHub] Added {UserId} to staff group", userId);
        }

        await base.OnConnectedAsync();
    }

    public async Task JoinConversation(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!await HasConversationAccessAsync(conversationId, userId, isAdmin))
            throw new HubException("Not authorized to join this conversation");

        await Groups.AddToGroupAsync(Context.ConnectionId, ConversationGroupName(conversationId));
        _logger.LogDebug("[ConversationHub] {UserId} joined conversation {ConversationId}", userId, conversationId);
    }

    public async Task LeaveConversation(Guid conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ConversationGroupName(conversationId));
    }

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

        var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant is null)
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

        ConversationMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context
                .ConversationMessages.Include(m => m.Participant)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value && m.ConversationId == conversationId);
        }

        var message = new ConversationMessage
        {
            ConversationId = conversationId,
            ParticipantId = participant.Id,
            Content = content.Trim(),
            IsRead = false,
            ReplyToMessageId = replyToMessage?.Id,
        };

        _context.ConversationMessages.Add(message);
        await _context.SaveChangesAsync();

        var senderName =
            await _context
                .Users.Where(u => u.Id == userId)
                .Select(u => u.UserName ?? u.Email ?? "Unknown")
                .FirstOrDefaultAsync()
            ?? "Unknown";

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
                : null
        );

        await Clients.Group(ConversationGroupName(conversationId)).SendAsync("ConversationMessageReceived", response);

        // Notify staff inbox for new customer messages
        if (!isAdmin)
        {
            await Clients
                .Group(StaffGroupName)
                .SendAsync("ConversationUpdated", new { conversationId, triggeredBy = userId });
        }
    }

    public async Task MarkConversationRead(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        var isAdmin = await IsAdminAsync(userId);
        if (!await HasConversationAccessAsync(conversationId, userId, isAdmin))
            throw new HubException("Not authorized to mark read");

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

        await _context.SaveChangesAsync();

        await Clients
            .Group(ConversationGroupName(conversationId))
            .SendAsync(
                "ConversationMessagesRead",
                new
                {
                    conversationId,
                    readerId = userId,
                    messageIds = unreadMessages.Select(m => m.Id).ToList(),
                    readAt = now,
                }
            );
    }

    public async Task StartTyping(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        await Clients
            .Group(ConversationGroupName(conversationId))
            .SendAsync("UserStartedTyping", new { conversationId, userId });
    }

    public async Task StopTyping(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId is null)
            throw new HubException("User not authenticated");

        await Clients
            .Group(ConversationGroupName(conversationId))
            .SendAsync("UserStoppedTyping", new { conversationId, userId });
    }

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
                    content = message.Content,
                    isEdited = message.IsEdited,
                    editedAt = message.EditedAt,
                }
            );
    }

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
                    isDeleted = true,
                    deletedAt = message.DeletedAt,
                }
            );
    }
}
