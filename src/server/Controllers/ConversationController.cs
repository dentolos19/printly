using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;

namespace PrintlyServer.Controllers;

[Route("conversation")]
[Authorize(Roles = Roles.Admin + "," + Roles.User)]
public class ConversationController(DatabaseContext context) : BaseController(context)
{
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
        DateTime CreatedAt,
        DateTime UpdatedAt,
        int UnreadCount,
        MessagePreview? LastMessage,
        IEnumerable<ParticipantResponse> Participants
    );

    public record CreateConversationRequest(List<string> ParticipantIds, string? Subject);

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
        [FromQuery] bool includeAllForStaff = false
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
            query = query.Where(c => c.Participants.Any(p => p.UserId == currentUserId));
        }

        // Fetch conversations with minimal data
        var conversationList = await query
            .Select(c => new
            {
                c.Id,
                c.Subject,
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
                c.CreatedAt,
                c.UpdatedAt,
                messages
                    .Where(m => m.ConversationId == c.Id && m.Participant.UserId != currentUserId && !m.IsRead)
                    .Count(),
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
            .OrderByDescending(c => c.LastMessage != null ? c.LastMessage.CreatedAt : c.CreatedAt)
            .ToList();

        return Ok(conversations);
    }

    [HttpPost]
    public async Task<ActionResult<ConversationResponse>> CreateConversation(
        [FromBody] CreateConversationRequest request
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
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

        var existingConversation = await Context
            .Conversations.Where(c => c.Participants.Count == participantIds.Count)
            .Where(c => c.Participants.All(p => participantIds.Contains(p.UserId)))
            .Select(c => new ConversationResponse(
                c.Id,
                c.Subject,
                c.CreatedAt,
                c.UpdatedAt,
                c.Messages.Count(m => m.Participant.UserId != currentUserId && !m.IsRead),
                c.Messages.OrderByDescending(m => m.CreatedAt)
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
                c.Participants.Select(p => new ParticipantResponse(
                    p.Id,
                    p.UserId,
                    p.User.UserName ?? p.User.Email ?? "Unknown",
                    p.User.Email ?? string.Empty,
                    p.Role,
                    p.UserId == currentUserId
                ))
            ))
            .FirstOrDefaultAsync();

        if (existingConversation is not null)
        {
            return Ok(existingConversation);
        }

        var conversation = new Conversation
        {
            Subject = string.IsNullOrWhiteSpace(request.Subject) ? null : request.Subject.Trim(),
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

        var created = await Context
            .Conversations.Where(c => c.Id == conversation.Id)
            .Select(c => new ConversationResponse(
                c.Id,
                c.Subject,
                c.CreatedAt,
                c.UpdatedAt,
                0,
                null,
                c.Participants.Select(p => new ParticipantResponse(
                    p.Id,
                    p.UserId,
                    p.User.UserName ?? p.User.Email ?? "Unknown",
                    p.User.Email ?? string.Empty,
                    p.Role,
                    p.UserId == currentUserId
                ))
            ))
            .FirstAsync();

        return CreatedAtAction(nameof(GetConversations), new { id = created.Id }, created);
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
