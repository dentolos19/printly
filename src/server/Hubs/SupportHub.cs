using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Hubs;

[Authorize(Roles = "User,Admin")]
public class SupportHub(DatabaseContext context, ILogger<SupportHub> logger) : Hub
{
    private readonly DatabaseContext _context = context;
    private readonly ILogger<SupportHub> _logger = logger;

    public record TicketMessageResponse(
        Guid Id,
        Guid TicketId,
        string SenderId,
        string SenderName,
        string Content,
        DateTime CreatedAt
    );

    private string? GetUserId()
    {
        return Context.UserIdentifier
            ?? Context.User?.FindFirst("sub")?.Value
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    private async Task<bool> IsAdmin()
    {
        var userId = GetUserId();
        if (userId == null) return false;

        var userRoles = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToListAsync();

        var adminRoles = await _context.Roles
            .Where(r => userRoles.Contains(r.Id) && r.Name == "Admin")
            .AnyAsync();

        return adminRoles;
    }

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

    // Send message in a support ticket
    public async Task SendTicketMessage(Guid ticketId, string content)
    {
        var senderId = GetUserId();
        if (senderId == null)
        {
            throw new HubException("User not authenticated");
        }

        var sender = await _context.Users.FindAsync(senderId);
        if (sender == null)
        {
            throw new HubException("Sender not found");
        }

        var ticket = await _context.Tickets
            .Include(t => t.Customer)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null)
        {
            throw new HubException("Ticket not found");
        }

        // Check authorization: must be the ticket owner or an admin
        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != senderId)
        {
            throw new HubException("Unauthorized to access this ticket");
        }

        // Create the message
        var message = new TicketMessage
        {
            TicketId = ticketId,
            SenderId = senderId,
            Content = content,
            IsReadByCustomer = isAdmin,   // If admin sends, customer hasn't read yet
            IsReadByAdmin = !isAdmin      // If customer sends, admin hasn't read yet
        };

        await _context.TicketMessages.AddAsync(message);

        // Update ticket metadata
        ticket.LastMessageAt = DateTime.UtcNow;
        if (!isAdmin)
        {
            ticket.UnreadCount++;
        }
        if (ticket.Status == TicketStatus.Pending)
        {
            ticket.Status = TicketStatus.Active;
        }

        await _context.SaveChangesAsync();

        var response = new TicketMessageResponse(
            message.Id,
            message.TicketId,
            message.SenderId,
            sender.UserName ?? sender.Email ?? "Unknown",
            message.Content,
            message.CreatedAt
        );

        // Send to all admins
        await Clients.Group("Admins").SendAsync("ReceiveTicketMessage", response);

        // Send to the customer
        await Clients.User(ticket.CustomerId).SendAsync("ReceiveTicketMessage", response);

        _logger.LogInformation("[SupportHub] Message sent in ticket {TicketId}", ticketId);
    }

    // Admin broadcasts announcement to everyone
    [Authorize(Roles = "Admin")]
    public async Task SendBroadcast(string title, string content)
    {
        var senderId = GetUserId();
        if (senderId == null)
        {
            throw new HubException("User not authenticated");
        }

        var broadcast = new Broadcast
        {
            SenderId = senderId,
            Title = title,
            Content = content,
            IsActive = true
        };

        await _context.Broadcasts.AddAsync(broadcast);
        await _context.SaveChangesAsync();

        // Send to ALL connected users
        await Clients.All.SendAsync("ReceiveBroadcast", new
        {
            id = broadcast.Id,
            title = broadcast.Title,
            content = broadcast.Content,
            createdAt = broadcast.CreatedAt
        });

        _logger.LogInformation("[SupportHub] Broadcast sent: {Title}", title);
    }
}
