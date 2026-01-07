using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;

namespace PrintlyServer.Controllers;

/// <summary>
/// Controller for managing private chat messages between users.
/// </summary>
[Route("message")]
[Authorize(Roles = "User,Admin")]
public class MessageController(DatabaseContext context) : BaseController(context)
{
    /// <summary>
    /// Response DTO for a message.
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
    /// Response DTO for a user (for the contacts list).
    /// </summary>
    public record UserResponse(string Id, string Name, string Email, int UnreadCount);

    /// <summary>
    /// Gets all users that the current user can chat with, with unread counts.
    /// </summary>
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers()
    {
        var currentUserId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        // Get all users except current user
        var users = await Context.Users.Where(u => u.Id != currentUserId).ToListAsync();

        // Calculate unread count for each user
        var userResponses = new List<UserResponse>();
        foreach (var user in users)
        {
            var unreadCount = await Context.Messages.CountAsync(m =>
                m.SenderId == user.Id && m.ReceiverId == currentUserId && !m.IsRead
            );

            userResponses.Add(new UserResponse(user.Id, user.UserName ?? "Unknown", user.Email ?? "", unreadCount));
        }

        return Ok(userResponses);
    }

    /// <summary>
    /// Gets the conversation history between the current user and another user.
    /// </summary>
    [HttpGet("{userId}")]
    public async Task<ActionResult<IEnumerable<MessageResponse>>> GetMessages(string userId)
    {
        var currentUserId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId is null)
        {
            return Unauthorized();
        }

        var messages = await Context.Messages
            .Include(m => m.Sender)
            .Where(m =>
                (m.SenderId == currentUserId && m.ReceiverId == userId)
                || (m.SenderId == userId && m.ReceiverId == currentUserId)
            )
            .OrderBy(m => m.CreatedAt)
            .Take(50)
            .Select(m => new MessageResponse(
                m.Id,
                m.Content,
                m.SenderId,
                m.Sender.UserName ?? "Unknown",
                m.ReceiverId,
                m.IsRead,
                m.ReadAt,
                m.IsEdited,
                m.EditedAt,
                m.IsDeleted,
                m.DeletedAt,
                m.CreatedAt,
                m.ReplyToMessageId,
                m.ReplyToMessage != null ? m.ReplyToMessage.Content : null,
                m.ReplyToMessage != null ? m.ReplyToMessage.Sender.UserName : null
            ))
            .ToListAsync();

        return Ok(messages);
    }
}
