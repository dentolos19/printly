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
[Authorize(Roles = "User")]
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
        DateTime CreatedAt
    );

    /// <summary>
    /// Response DTO for a user (for the contacts list).
    /// </summary>
    public record UserResponse(
        string Id,
        string Name,
        string Email
    );

    /// <summary>
    /// Gets all users that the current user can chat with.
    /// </summary>
    /// <returns>A list of users excluding the current user.</returns>
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers()
    {
        // With MapInboundClaims = false, "sub" claim stays as "sub"
        var currentUserId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var users = await Context
            .Users
            .Where(u => u.Id != currentUserId)
            .Select(u => new UserResponse(
                u.Id,
                u.UserName ?? "Unknown",
                u.Email ?? ""
            ))
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Gets the conversation history between the current user and another user.
    /// </summary>
    /// <param name="userId">The ID of the other user in the conversation.</param>
    /// <returns>The last 50 messages between both users.</returns>
    [HttpGet("{userId}")]
    public async Task<ActionResult<IEnumerable<MessageResponse>>> GetMessages(string userId)
    {
        // With MapInboundClaims = false, "sub" claim stays as "sub"
        var currentUserId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId is null)
        {
            return Unauthorized();
        }

        // Get messages where current user is either sender or receiver with the other user
        var messages = await Context
            .Messages
            .Include(m => m.Sender)
            .Where(m =>
                (m.SenderId == currentUserId && m.ReceiverId == userId) ||
                (m.SenderId == userId && m.ReceiverId == currentUserId))
            .OrderBy(m => m.CreatedAt)
            .Take(50)
            .Select(m => new MessageResponse(
                m.Id,
                m.Content,
                m.SenderId,
                m.Sender.UserName ?? "Unknown",
                m.ReceiverId,
                m.CreatedAt
            ))
            .ToListAsync();

        return Ok(messages);
    }
}
