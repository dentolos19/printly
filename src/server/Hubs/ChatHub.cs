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
[Authorize(Roles = "User")]
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
        DateTime CreatedAt
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
        return user?.FindFirst("sub")?.Value
            ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    /// <summary>
    /// Sends a private message to a specific user.
    /// </summary>
    public async Task SendMessage(string receiverId, string message)
    {
        var senderId = GetUserId();

        _logger.LogInformation("SendMessage called - SenderId: {SenderId}, ReceiverId: {ReceiverId}", senderId, receiverId);

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

        // Create message
        var msg = new Message
        {
            Content = message.Trim(),
            SenderId = senderId,
            ReceiverId = receiverId,
        };

        _context.Messages.Add(msg);
        await _context.SaveChangesAsync();

        // Build response
        var response = new MessageResponse(
            msg.Id,
            msg.Content,
            msg.SenderId,
            sender.UserName ?? sender.Email ?? "Unknown",
            msg.ReceiverId,
            msg.CreatedAt
        );

        // Send to both users
        await Clients.User(receiverId).SendAsync("ReceiveMessage", response);
        await Clients.User(senderId).SendAsync("ReceiveMessage", response);

        _logger.LogInformation("Message sent successfully from {Sender} to {Receiver}", senderId, receiverId);
    }

    /// <summary>
    /// Called when a user connects.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();

        _logger.LogInformation("User connecting - UserId: {UserId}, ConnectionId: {ConnectionId}", userId, Context.ConnectionId);

        if (!string.IsNullOrEmpty(userId))
        {
            OnlineUsers.AddOrUpdate(
                userId,
                _ => [Context.ConnectionId],
                (_, connections) =>
                {
                    lock (connections) { connections.Add(Context.ConnectionId); }
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
}
