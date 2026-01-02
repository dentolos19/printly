using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

/// <summary>
/// Controller for managing support tickets between customers and admins.
/// </summary>
[Route("ticket")]
[Authorize(Roles = "User,Admin")]
public class TicketController(DatabaseContext context, INotificationService notificationService)
    : BaseController(context)
{
    private readonly INotificationService _notificationService = notificationService;

    public record CreateTicketRequest(string Subject, Guid? OrderId);

    public record TicketResponse(
        Guid Id,
        string CustomerId,
        string CustomerName,
        string Subject,
        TicketStatus Status,
        TicketPriority Priority,
        Guid? OrderId,
        DateTime LastMessageAt,
        int UnreadCount,
        DateTime CreatedAt
    );

    public record TicketMessageResponse(
        Guid Id,
        string SenderId,
        string SenderName,
        string Content,
        bool IsReadByCustomer,
        bool IsReadByAdmin,
        DateTime CreatedAt
    );

    public record UpdateStatusRequest(TicketStatus Status);

    private async Task<bool> IsAdmin()
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return false;

        var userRoles = await Context.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToListAsync();

        return await Context.Roles.Where(r => userRoles.Contains(r.Id) && r.Name == "Admin").AnyAsync();
    }

    /// <summary>
    /// Create a new support ticket.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TicketResponse>> CreateTicket([FromBody] CreateTicketRequest request)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var user = await Context.Users.FindAsync(userId);
        if (user == null)
            return NotFound("User not found");

        var ticket = new Ticket
        {
            CustomerId = userId,
            Subject = request.Subject,
            OrderId = request.OrderId,
            Status = TicketStatus.Pending,
            Priority = TicketPriority.Normal,
            LastMessageAt = DateTime.UtcNow,
        };

        await Context.Tickets.AddAsync(ticket);
        await Context.SaveChangesAsync();

        // Notify all admins about new ticket
        await _notificationService.NotifyAdminsAsync(
            NotificationType.TicketCreated,
            "New Support Ticket",
            $"{user.UserName ?? user.Email} created a new ticket: {ticket.Subject}",
            ticket.Id,
            NotificationPriority.Normal
        );

        return Ok(
            new TicketResponse(
                ticket.Id,
                ticket.CustomerId,
                user.UserName ?? user.Email ?? "Unknown",
                ticket.Subject,
                ticket.Status,
                ticket.Priority,
                ticket.OrderId,
                ticket.LastMessageAt,
                ticket.UnreadCount,
                ticket.CreatedAt
            )
        );
    }

    /// <summary>
    /// Get all tickets. Admins see ALL tickets, users see only theirs.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<TicketResponse>>> GetTickets([FromQuery] TicketStatus? status = null)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var isAdmin = await IsAdmin();

        var query = Context.Tickets.Include(t => t.Customer).AsQueryable();

        // Non-admins only see their own tickets
        if (!isAdmin)
        {
            query = query.Where(t => t.CustomerId == userId);
        }

        // Optional status filter
        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        var tickets = await query
            .OrderByDescending(t => t.LastMessageAt)
            .Select(t => new TicketResponse(
                t.Id,
                t.CustomerId,
                t.Customer.UserName ?? t.Customer.Email ?? "Unknown",
                t.Subject,
                t.Status,
                t.Priority,
                t.OrderId,
                t.LastMessageAt,
                t.UnreadCount,
                t.CreatedAt
            ))
            .ToListAsync();

        return Ok(tickets);
    }

    /// <summary>
    /// Get a single ticket by ID.
    /// </summary>
    [HttpGet("{ticketId:guid}")]
    public async Task<ActionResult<TicketResponse>> GetTicket(Guid ticketId)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var ticket = await Context.Tickets.Include(t => t.Customer).FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null)
            return NotFound("Ticket not found");

        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != userId)
        {
            return Forbid();
        }

        return Ok(
            new TicketResponse(
                ticket.Id,
                ticket.CustomerId,
                ticket.Customer.UserName ?? ticket.Customer.Email ?? "Unknown",
                ticket.Subject,
                ticket.Status,
                ticket.Priority,
                ticket.OrderId,
                ticket.LastMessageAt,
                ticket.UnreadCount,
                ticket.CreatedAt
            )
        );
    }

    /// <summary>
    /// Get all messages in a ticket.
    /// </summary>
    [HttpGet("{ticketId:guid}/messages")]
    public async Task<ActionResult<List<TicketMessageResponse>>> GetTicketMessages(Guid ticketId)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound("Ticket not found");

        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != userId)
        {
            return Forbid();
        }

        var messages = await Context
            .TicketMessages.Include(m => m.Sender)
            .Where(m => m.TicketId == ticketId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new TicketMessageResponse(
                m.Id,
                m.SenderId,
                m.Sender.UserName ?? m.Sender.Email ?? "Unknown",
                m.Content,
                m.IsReadByCustomer,
                m.IsReadByAdmin,
                m.CreatedAt
            ))
            .ToListAsync();

        return Ok(messages);
    }

    /// <summary>
    /// Mark all messages in a ticket as read.
    /// </summary>
    [HttpPost("{ticketId:guid}/mark-read")]
    public async Task<IActionResult> MarkAsRead(Guid ticketId)
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound();

        var isAdmin = await IsAdmin();
        if (!isAdmin && ticket.CustomerId != userId)
        {
            return Forbid();
        }

        var messages = await Context.TicketMessages.Where(m => m.TicketId == ticketId).ToListAsync();

        foreach (var msg in messages)
        {
            if (isAdmin)
            {
                msg.IsReadByAdmin = true;
            }
            else
            {
                msg.IsReadByCustomer = true;
            }
        }

        if (!isAdmin)
        {
            ticket.UnreadCount = 0;
        }

        await Context.SaveChangesAsync();
        return Ok();
    }

    /// <summary>
    /// Update ticket status (Admin only).
    /// </summary>
    [HttpPut("{ticketId:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTicketStatus(Guid ticketId, [FromBody] UpdateStatusRequest request)
    {
        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound();

        var oldStatus = ticket.Status;
        ticket.Status = request.Status;
        await Context.SaveChangesAsync();

        // Notify customer about status change
        await _notificationService.CreateNotificationAsync(
            ticket.CustomerId,
            NotificationType.TicketStatusChanged,
            "Ticket Status Updated",
            $"Your ticket status changed from {oldStatus} to {request.Status}",
            ticket.Id,
            null,
            NotificationPriority.Normal,
            $"/support?ticket={ticketId}"
        );

        return Ok();
    }

    /// <summary>
    /// Update ticket priority (Admin only).
    /// </summary>
    [HttpPut("{ticketId:guid}/priority")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTicketPriority(Guid ticketId, [FromBody] TicketPriority priority)
    {
        var ticket = await Context.Tickets.FindAsync(ticketId);
        if (ticket == null)
            return NotFound();

        var oldPriority = ticket.Priority;
        ticket.Priority = priority;
        await Context.SaveChangesAsync();

        // Notify customer about priority change
        await _notificationService.CreateNotificationAsync(
            ticket.CustomerId,
            NotificationType.TicketPriorityChanged,
            "Ticket Priority Changed",
            $"Your ticket priority changed from {oldPriority} to {priority}",
            ticket.Id,
            null,
            NotificationPriority.Normal,
            $"/support?ticket={ticketId}"
        );

        return Ok();
    }
}
