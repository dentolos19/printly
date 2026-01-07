using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Hubs;

[Authorize(Roles = "User,Admin")]
public class SupportHub(DatabaseContext context, ILogger<SupportHub> logger, INotificationService notificationService)
    : Hub
{
    private readonly DatabaseContext _context = context;
    private readonly ILogger<SupportHub> _logger = logger;
    private readonly INotificationService _notificationService = notificationService;

    public record TicketMessageResponse(
        Guid Id,
        Guid TicketId,
        string SenderId,
        string SenderName,
        string Content,
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

    private async Task<bool> IsAdmin()
    {
        var userId = GetUserId();
        if (userId == null)
            return false;

        var userRoles = await _context.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToListAsync();

        var adminRoles = await _context.Roles.Where(r => userRoles.Contains(r.Id) && r.Name == "Admin").AnyAsync();

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
    public async Task SendTicketMessage(Guid ticketId, string content, Guid? replyToMessageId = null)
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

        var ticket = await _context.Tickets.Include(t => t.Customer).FirstOrDefaultAsync(t => t.Id == ticketId);

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

        // Validate reply-to message if provided
        TicketMessage? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await _context.TicketMessages
                .Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == replyToMessageId.Value);
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

        // Build response with reply info
        string? replyToContent = null;
        string? replyToSenderName = null;
        if (replyToMessage != null)
        {
            replyToContent = replyToMessage.Content;
            replyToSenderName = replyToMessage.Sender?.UserName ?? replyToMessage.Sender?.Email ?? "Unknown";
        }

        var response = new TicketMessageResponse(
            message.Id,
            message.TicketId,
            message.SenderId,
            sender.UserName ?? sender.Email ?? "Unknown",
            message.Content,
            message.CreatedAt,
            message.ReplyToMessageId,
            replyToContent,
            replyToSenderName
        );

        // Send to all admins
        await Clients.Group("Admins").SendAsync("ReceiveTicketMessage", response);

        // Send to the customer
        await Clients.User(ticket.CustomerId).SendAsync("ReceiveTicketMessage", response);

        // Send notification
        if (isAdmin)
        {
            // Admin replied - notify customer
            await _notificationService.CreateNotificationAsync(
                ticket.CustomerId,
                NotificationType.NewMessage,
                "New Reply from Support",
                $"{sender.UserName ?? "Admin"} replied to your ticket",
                ticketId,
                message.Id,
                NotificationPriority.Normal,
                $"/support?ticket={ticketId}"
            );
        }
        else
        {
            // Customer sent message - notify all admins
            await _notificationService.NotifyAdminsAsync(
                NotificationType.NewMessage,
                "New Customer Message",
                $"{sender.UserName ?? sender.Email} sent a message in ticket: {ticket.Subject}",
                ticketId,
                NotificationPriority.Normal
            );
        }

        _logger.LogInformation("[SupportHub] Message sent in ticket {TicketId}", ticketId);
    }

    /// <summary>
    /// User started typing in ticket - ephemeral event
    /// </summary>
    public async Task StartTypingInTicket(Guid ticketId)
    {
        var senderId = GetUserId();
        if (senderId == null) return;

        var sender = await _context.Users.FindAsync(senderId);
        if (sender == null) return;

        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null) return;

        var isAdmin = await IsAdmin();

        var typingData = new
        {
            userId = senderId,
            userName = sender.UserName ?? sender.Email,
            ticketId = ticketId
        };

        // Notify appropriate party
        if (!isAdmin)
        {
            // Customer typing - notify all admins
            await Clients.Group("Admins").SendAsync("UserStartedTyping", typingData);
        }
        else
        {
            // Admin typing - notify customer
            await Clients.User(ticket.CustomerId).SendAsync("UserStartedTyping", typingData);
        }

        _logger.LogDebug("[SupportHub] {SenderId} started typing in ticket {TicketId}", senderId, ticketId);
    }

    /// <summary>
    /// User stopped typing in ticket - ephemeral event
    /// </summary>
    public async Task StopTypingInTicket(Guid ticketId)
    {
        var senderId = GetUserId();
        if (senderId == null) return;

        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null) return;

        var isAdmin = await IsAdmin();

        var typingData = new
        {
            userId = senderId,
            ticketId = ticketId
        };

        // Notify appropriate party
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
}
