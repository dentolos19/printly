using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("conversation")]
[Authorize(Roles = Roles.Admin + "," + Roles.User)]
public class ConversationController(DatabaseContext context, INotificationService notificationService)
    : BaseController(context)
{
    private readonly INotificationService _notificationService = notificationService;

    public record ContactResponse(string Id, string Name, string Email, string Role);

    public record ParticipantResponse(
        Guid Id,
        string UserId,
        string Name,
        string Email,
        ConversationParticipantRole Role,
        bool IsCurrentUser
    );

    public record MessagePreview(
        Guid Id,
        string Content,
        string SenderId,
        string SenderName,
        bool IsRead,
        bool IsDeleted,
        bool IsEdited,
        DateTime CreatedAt
    );

    public record MessageResponse(
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

    public record ConversationResponse(
        Guid Id,
        string? Subject,
        string CustomerId,
        string CustomerName,
        ConversationStatus Status,
        ConversationPriority Priority,
        Guid? OrderId,
        DateTime? LastMessageAt,
        int UnreadCount,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        MessagePreview? LastMessage,
        IEnumerable<ParticipantResponse> Participants
    );

    public record CreateConversationRequest(List<string> ParticipantIds, string? Subject);

    // New request for creating support conversations
    public record CreateSupportConversationRequest(string Subject, Guid? OrderId, string? InitialMessage);

    // Request for updating status/priority
    public record UpdateConversationStatusRequest(ConversationStatus Status);

    public record UpdateConversationPriorityRequest(ConversationPriority Priority);

    [HttpGet("contacts")]
    public async Task<ActionResult<IEnumerable<ContactResponse>>> GetContacts()
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var users = await Context.Users.Where(u => u.Id != currentUserId).ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();
        var userRoleMap = await Context
            .UserRoles.Where(ur => userIds.Contains(ur.UserId))
            .Join(Context.Roles, ur => ur.RoleId, r => r.Id, (ur, role) => new { ur.UserId, RoleName = role.Name })
            .ToListAsync();

        var roleDict = userRoleMap
            .GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => g.First().RoleName ?? Roles.User);

        var contacts = users
            .Select(u => new ContactResponse(
                u.Id,
                u.UserName ?? u.Email ?? "Unknown",
                u.Email ?? string.Empty,
                roleDict.TryGetValue(u.Id, out var role) ? role : Roles.User
            ))
            .OrderBy(c => c.Name)
            .ToList();

        return Ok(contacts);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConversationResponse>>> GetConversations(
        [FromQuery] bool includeAllForStaff = false,
        [FromQuery] ConversationStatus? status = null
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole(Roles.Admin);
        if (!isAdmin)
        {
            includeAllForStaff = false;
        }

        var query = Context.Conversations.AsQueryable();

        if (!includeAllForStaff)
        {
            // Users see only their own conversations (where they are the customer)
            query = query.Where(c =>
                c.CustomerId == currentUserId || c.Participants.Any(p => p.UserId == currentUserId)
            );
        }

        // Filter by status if provided
        if (status.HasValue)
        {
            query = query.Where(c => c.Status == status.Value);
        }

        // Fetch conversations with all fields
        var conversationList = await query
            .Include(c => c.Customer)
            .Select(c => new
            {
                c.Id,
                c.Subject,
                c.CustomerId,
                CustomerName = c.Customer.UserName ?? c.Customer.Email ?? "Unknown",
                c.Status,
                c.Priority,
                c.OrderId,
                c.LastMessageAt,
                c.UnreadCount,
                c.CreatedAt,
                c.UpdatedAt,
            })
            .ToListAsync();

        var conversationIds = conversationList.Select(c => c.Id).ToList();

        // Fetch all messages and participants for these conversations
        var messages = await Context
            .ConversationMessages.Where(m => conversationIds.Contains(m.ConversationId))
            .Include(m => m.Participant)
                .ThenInclude(p => p.User)
            .ToListAsync();

        var participants = await Context
            .ConversationParticipants.Where(p => conversationIds.Contains(p.ConversationId))
            .Include(p => p.User)
            .ToListAsync();

        // Compose response objects in memory
        var conversations = conversationList
            .Select(c => new ConversationResponse(
                c.Id,
                c.Subject,
                c.CustomerId,
                c.CustomerName,
                c.Status,
                c.Priority,
                c.OrderId,
                c.LastMessageAt,
                c.UnreadCount,
                c.CreatedAt,
                c.UpdatedAt,
                messages
                    .Where(m => m.ConversationId == c.Id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => new MessagePreview(
                        m.Id,
                        m.Content,
                        m.Participant.UserId,
                        m.Participant.User.UserName ?? m.Participant.User.Email ?? "Unknown",
                        m.IsRead,
                        m.IsDeleted,
                        m.IsEdited,
                        m.CreatedAt
                    ))
                    .FirstOrDefault(),
                participants
                    .Where(p => p.ConversationId == c.Id)
                    .Select(p => new ParticipantResponse(
                        p.Id,
                        p.UserId,
                        p.User.UserName ?? p.User.Email ?? "Unknown",
                        p.User.Email ?? string.Empty,
                        p.Role,
                        p.UserId == currentUserId
                    ))
            ))
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToList();

        return Ok(conversations);
    }

    /// <summary>
    /// Create a new support conversation. All admins are automatically added as participants.
    /// Customers can use this to start a support ticket.
    /// </summary>
    [HttpPost("support")]
    public async Task<ActionResult<ConversationResponse>> CreateSupportConversation(
        [FromBody] CreateSupportConversationRequest request
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Subject))
            return BadRequest("Subject is required for support conversations.");

        var currentUser = await Context.Users.FindAsync(currentUserId);
        if (currentUser is null)
            return Unauthorized();

        // Create the conversation with the customer as the owner
        var conversation = new Conversation
        {
            Subject = request.Subject.Trim(),
            CustomerId = currentUserId,
            OrderId = request.OrderId,
            Status = ConversationStatus.Pending,
            Priority = ConversationPriority.Normal,
        };

        Context.Conversations.Add(conversation);

        // Add the customer as a participant
        var customerParticipant = new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId = currentUserId,
            Role = ConversationParticipantRole.Member,
        };
        Context.ConversationParticipants.Add(customerParticipant);

        // Auto-add all admins as participants
        var adminRoleId = await Context.Roles.Where(r => r.Name == Roles.Admin).Select(r => r.Id).FirstOrDefaultAsync();

        if (adminRoleId != null)
        {
            var adminUserIds = await Context
                .UserRoles.Where(ur => ur.RoleId == adminRoleId)
                .Select(ur => ur.UserId)
                .ToListAsync();

            foreach (var adminId in adminUserIds)
            {
                Context.ConversationParticipants.Add(
                    new ConversationParticipant
                    {
                        ConversationId = conversation.Id,
                        UserId = adminId,
                        Role = ConversationParticipantRole.Admin,
                    }
                );
            }
        }

        await Context.SaveChangesAsync();

        // If an initial message was provided, add it
        if (!string.IsNullOrWhiteSpace(request.InitialMessage))
        {
            var message = new ConversationMessage
            {
                ConversationId = conversation.Id,
                ParticipantId = customerParticipant.Id,
                Content = request.InitialMessage.Trim(),
                IsRead = false,
            };

            Context.ConversationMessages.Add(message);
            conversation.LastMessageAt = DateTime.UtcNow;
            conversation.UnreadCount = 1;

            await Context.SaveChangesAsync();

            // Notify admins about the new conversation
            await _notificationService.NotifyAdminsAsync(
                NotificationType.NewMessage,
                "New Support Conversation",
                $"{currentUser.UserName ?? currentUser.Email} started a conversation: {request.Subject}",
                conversation.Id,
                NotificationPriority.Normal
            );
        }

        // Build and return the response
        var participants = await Context
            .ConversationParticipants.Where(p => p.ConversationId == conversation.Id)
            .Include(p => p.User)
            .ToListAsync();

        var lastMessage = await Context
            .ConversationMessages.Where(m => m.ConversationId == conversation.Id)
            .OrderByDescending(m => m.CreatedAt)
            .Include(m => m.Participant)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync();

        var response = new ConversationResponse(
            conversation.Id,
            conversation.Subject,
            conversation.CustomerId,
            currentUser.UserName ?? currentUser.Email ?? "Unknown",
            conversation.Status,
            conversation.Priority,
            conversation.OrderId,
            conversation.LastMessageAt,
            conversation.UnreadCount,
            conversation.CreatedAt,
            conversation.UpdatedAt,
            lastMessage != null
                ? new MessagePreview(
                    lastMessage.Id,
                    lastMessage.Content,
                    lastMessage.Participant.UserId,
                    lastMessage.Participant.User.UserName ?? lastMessage.Participant.User.Email ?? "Unknown",
                    lastMessage.IsRead,
                    lastMessage.IsDeleted,
                    lastMessage.IsEdited,
                    lastMessage.CreatedAt
                )
                : null,
            participants.Select(p => new ParticipantResponse(
                p.Id,
                p.UserId,
                p.User.UserName ?? p.User.Email ?? "Unknown",
                p.User.Email ?? string.Empty,
                p.Role,
                p.UserId == currentUserId
            ))
        );

        return CreatedAtAction(nameof(GetConversations), new { id = response.Id }, response);
    }

    /// <summary>
    /// Update conversation status. Admin only.
    /// </summary>
    [HttpPatch("{conversationId:guid}/status")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateStatus(
        Guid conversationId,
        [FromBody] UpdateConversationStatusRequest request
    )
    {
        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound();

        conversation.Status = request.Status;
        await Context.SaveChangesAsync();

        // Notify the customer if resolved or closed
        if (request.Status == ConversationStatus.Resolved || request.Status == ConversationStatus.Closed)
        {
            var statusText = request.Status == ConversationStatus.Resolved ? "resolved" : "closed";
            await _notificationService.CreateNotificationAsync(
                conversation.CustomerId,
                NotificationType.TicketStatusChanged,
                $"Conversation {statusText}",
                $"Your support conversation has been marked as {statusText}",
                conversationId,
                null,
                NotificationPriority.Normal,
                $"/support?conversation={conversationId}"
            );
        }

        return NoContent();
    }

    /// <summary>
    /// Update conversation priority. Admin only.
    /// </summary>
    [HttpPatch("{conversationId:guid}/priority")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdatePriority(
        Guid conversationId,
        [FromBody] UpdateConversationPriorityRequest request
    )
    {
        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound();

        conversation.Priority = request.Priority;
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Legacy endpoint for creating peer-to-peer conversations.
    /// For support conversations, use POST /conversation/support instead.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ConversationResponse>> CreateConversation(
        [FromBody] CreateConversationRequest request
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var currentUser = await Context.Users.FindAsync(currentUserId);
        if (currentUser is null)
            return Unauthorized();

        var participantIds =
            request
                .ParticipantIds?.Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct()
                .ToList()
            ?? [];

        if (!participantIds.Contains(currentUserId))
        {
            participantIds.Add(currentUserId);
        }

        if (participantIds.Count < 2)
        {
            return BadRequest("A conversation requires at least two participants.");
        }

        var userIdsInDb = await Context.Users.Where(u => participantIds.Contains(u.Id)).Select(u => u.Id).ToListAsync();
        if (userIdsInDb.Count != participantIds.Count)
        {
            return BadRequest("One or more participants do not exist.");
        }

        // Check if a conversation with these exact participants already exists
        var existingConversation = await Context
            .Conversations.Where(c => c.Participants.Count == participantIds.Count)
            .Where(c => c.Participants.All(p => participantIds.Contains(p.UserId)))
            .FirstOrDefaultAsync();

        if (existingConversation is not null)
        {
            // Return the existing conversation
            return await GetConversationById(existingConversation.Id, currentUserId);
        }

        var conversation = new Conversation
        {
            Subject = string.IsNullOrWhiteSpace(request.Subject) ? null : request.Subject.Trim(),
            CustomerId = currentUserId, // Current user is the initiator
            Status = ConversationStatus.Active, // Peer conversations start active
            Priority = ConversationPriority.Normal,
        };

        Context.Conversations.Add(conversation);

        var adminRoleId = await Context.Roles.Where(r => r.Name == Roles.Admin).Select(r => r.Id).FirstOrDefaultAsync();

        foreach (var userId in participantIds)
        {
            var isParticipantAdmin =
                adminRoleId != null
                && await Context.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == adminRoleId);
            conversation.Participants.Add(
                new ConversationParticipant
                {
                    UserId = userId,
                    Role = isParticipantAdmin ? ConversationParticipantRole.Admin : ConversationParticipantRole.Member,
                }
            );
        }

        await Context.SaveChangesAsync();

        return await GetConversationById(conversation.Id, currentUserId);
    }

    private async Task<ActionResult<ConversationResponse>> GetConversationById(
        Guid conversationId,
        string currentUserId
    )
    {
        var conversation = await Context
            .Conversations.Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation is null)
            return NotFound();

        var participants = await Context
            .ConversationParticipants.Where(p => p.ConversationId == conversationId)
            .Include(p => p.User)
            .ToListAsync();

        var lastMessage = await Context
            .ConversationMessages.Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Include(m => m.Participant)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync();

        var response = new ConversationResponse(
            conversation.Id,
            conversation.Subject,
            conversation.CustomerId,
            conversation.Customer.UserName ?? conversation.Customer.Email ?? "Unknown",
            conversation.Status,
            conversation.Priority,
            conversation.OrderId,
            conversation.LastMessageAt,
            conversation.UnreadCount,
            conversation.CreatedAt,
            conversation.UpdatedAt,
            lastMessage != null
                ? new MessagePreview(
                    lastMessage.Id,
                    lastMessage.Content,
                    lastMessage.Participant.UserId,
                    lastMessage.Participant.User.UserName ?? lastMessage.Participant.User.Email ?? "Unknown",
                    lastMessage.IsRead,
                    lastMessage.IsDeleted,
                    lastMessage.IsEdited,
                    lastMessage.CreatedAt
                )
                : null,
            participants.Select(p => new ParticipantResponse(
                p.Id,
                p.UserId,
                p.User.UserName ?? p.User.Email ?? "Unknown",
                p.User.Email ?? string.Empty,
                p.Role,
                p.UserId == currentUserId
            ))
        );

        return Ok(response);
    }

    [HttpGet("{conversationId:guid}/messages")]
    public async Task<ActionResult<IEnumerable<MessageResponse>>> GetMessages(
        Guid conversationId,
        [FromQuery] int take = 100
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole(Roles.Admin);
        var hasAccess =
            isAdmin
            || await Context.ConversationParticipants.AnyAsync(p =>
                p.ConversationId == conversationId && p.UserId == currentUserId
            );
        if (!hasAccess)
        {
            return Forbid();
        }

        take = Math.Clamp(take, 1, 200);

        var messages = await Context
            .ConversationMessages.Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt)
            .Take(take)
            .Select(m => new MessageResponse(
                m.Id,
                m.ConversationId,
                m.ParticipantId,
                m.Participant.UserId,
                m.Participant.User.UserName ?? m.Participant.User.Email ?? "Unknown",
                m.Content,
                m.IsRead,
                m.ReadAt,
                m.IsEdited,
                m.EditedAt,
                m.IsDeleted,
                m.DeletedAt,
                m.CreatedAt,
                m.ReplyToMessageId,
                m.ReplyToMessage != null ? m.ReplyToMessage.Content : null,
                m.ReplyToMessage != null
                    ? m.ReplyToMessage.Participant.User.UserName ?? m.ReplyToMessage.Participant.User.Email
                    : null
            ))
            .ToListAsync();

        return Ok(messages);
    }

    [HttpPost("{conversationId:guid}/read")]
    public async Task<IActionResult> MarkConversationAsRead(Guid conversationId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole(Roles.Admin);
        var hasAccess =
            isAdmin
            || await Context.ConversationParticipants.AnyAsync(p =>
                p.ConversationId == conversationId && p.UserId == currentUserId
            );
        if (!hasAccess)
        {
            return Forbid();
        }

        var unreadMessages = await Context
            .ConversationMessages.Where(m =>
                m.ConversationId == conversationId && m.Participant.UserId != currentUserId && !m.IsRead
            )
            .ToListAsync();

        if (unreadMessages.Count == 0)
        {
            return NoContent();
        }

        var now = DateTime.UtcNow;
        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
            message.ReadAt = now;
        }

        await Context.SaveChangesAsync();

        return NoContent();
    }
}
