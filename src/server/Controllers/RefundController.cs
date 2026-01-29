using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Hubs;
using PrintlyServer.Services;
using Stripe;
using Refund = PrintlyServer.Data.Entities.Refund;

namespace PrintlyServer.Controllers;

[Route("refunds")]
[Authorize]
public class RefundController(
    DatabaseContext context,
    IConfiguration configuration,
    INotificationService notificationService,
    IHubContext<ConversationHub> hubContext
) : BaseController(context)
{
    private readonly INotificationService _notificationService = notificationService;
    private readonly IHubContext<ConversationHub> _hubContext = hubContext;
    private readonly string _stripeSecretKey =
        Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY")
        ?? configuration["Stripe:SecretKey"]
        ?? throw new InvalidOperationException("Stripe secret key not configured");

    // ==================== User Endpoints ====================

    /// <summary>
    /// Request a refund for an order
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<RefundResponse>> CreateRefundRequest([FromBody] CreateRefundRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Get the order with payment
        var order = await Context
            .Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.UserId == userId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        // Check order status - only allow refunds for paid or shipped orders
        if (
            order.Status != OrderStatus.Paid
            && order.Status != OrderStatus.Shipped
            && order.Status != OrderStatus.Delivered
        )
            return BadRequest(new { message = "Refunds can only be requested for paid, shipped, or delivered orders" });

        // Get the payment for this order
        var payment = await Context.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id);
        if (payment == null)
            return BadRequest(new { message = "No payment found for this order" });

        if (payment.Status != PaymentStatus.Paid)
            return BadRequest(new { message = "Payment has not been completed" });

        // Check if refund already exists for this order
        var existingRefund = await Context.Refunds.FirstOrDefaultAsync(r => r.OrderId == order.Id);
        if (existingRefund != null)
        {
            if (existingRefund.Status == RefundStatus.Completed)
                return BadRequest(new { message = "This order has already been refunded" });

            if (
                existingRefund.Status == RefundStatus.Requested
                || existingRefund.Status == RefundStatus.UnderReview
                || existingRefund.Status == RefundStatus.Approved
                || existingRefund.Status == RefundStatus.Processing
            )
                return BadRequest(new { message = "A refund request is already pending for this order" });

            // If rejected or failed, allow creating a new request
            Context.Refunds.Remove(existingRefund);
        }

        // Validate requested amount
        if (request.RequestedAmount <= 0)
            return BadRequest(new { message = "Requested amount must be greater than zero" });

        if (request.RequestedAmount > payment.Amount)
            return BadRequest(new { message = "Requested amount cannot exceed the payment amount" });

        // Get the user for conversation creation
        var currentUser = await Context.Users.FindAsync(userId);
        if (currentUser == null)
            return Unauthorized();

        // Get the reason label for the conversation subject
        var reasonLabel = GetReasonLabel((RefundReason)request.Reason);

        // Create a support conversation for this refund
        var conversation = new Conversation
        {
            Subject = $"Refund Request - Order #{order.Id.ToString()[..8]} - {reasonLabel}",
            CustomerId = userId,
            OrderId = order.Id,
            SupportMode = true,
            Status = ConversationStatus.Pending,
            Priority = ConversationPriority.High, // Refund requests are high priority
        };
        Context.Conversations.Add(conversation);

        // Add the customer as a participant
        var customerParticipant = new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId = userId,
            Role = ConversationParticipantRole.Member,
        };
        Context.ConversationParticipants.Add(customerParticipant);

        await Context.SaveChangesAsync();

        // Create initial message with refund details
        var initialMessage =
            $"**Refund Request Submitted**\n\n"
            + $"**Order:** #{order.Id.ToString()[..8]}\n"
            + $"**Amount Requested:** ${request.RequestedAmount:F2}\n"
            + $"**Reason:** {reasonLabel}\n"
            + (string.IsNullOrWhiteSpace(request.CustomerNotes) ? "" : $"\n**Details:**\n{request.CustomerNotes}");

        var message = new ConversationMessage
        {
            ConversationId = conversation.Id,
            ParticipantId = customerParticipant.Id,
            Content = initialMessage,
            IsRead = false,
        };
        Context.ConversationMessages.Add(message);

        conversation.LastMessageAt = DateTime.UtcNow;
        conversation.UnreadCount = 1;

        // Create refund request with conversation link
        var refund = new Refund
        {
            PaymentId = payment.Id,
            OrderId = order.Id,
            RequestedByUserId = userId,
            RequestedAmount = request.RequestedAmount,
            Reason = (RefundReason)request.Reason,
            CustomerNotes = request.CustomerNotes,
            Status = RefundStatus.Requested,
            RequestedAt = DateTime.UtcNow,
            ConversationId = conversation.Id,
        };

        Context.Refunds.Add(refund);

        // Update order status to RefundRequested
        order.Status = OrderStatus.RefundRequested;

        await Context.SaveChangesAsync();

        // Notify admins about the new refund request
        await _notificationService.NotifyAdminsAsync(
            NotificationType.ConversationCreated,
            "New Refund Request",
            $"{currentUser.UserName ?? currentUser.Email} requested a refund for Order #{order.Id.ToString()[..8]} - ${request.RequestedAmount:F2}",
            conversation.Id,
            NotificationPriority.High
        );

        // Reload with navigation properties
        var createdRefund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .FirstOrDefaultAsync(r => r.Id == refund.Id);

        return CreatedAtAction(nameof(GetRefund), new { id = refund.Id }, MapToRefundResponse(createdRefund!));
    }

    /// <summary>
    /// Get all refunds for current user
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<RefundSummaryResponse>>> GetMyRefunds()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var refunds = await Context
            .Refunds.Where(r => r.RequestedByUserId == userId)
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new RefundSummaryResponse(
                r.Id,
                r.OrderId,
                r.RequestedAmount,
                r.ApprovedAmount,
                (RefundReasonDto)r.Reason,
                (RefundStatusDto)r.Status,
                r.RequestedAt,
                r.ProcessedAt
            ))
            .ToListAsync();

        return Ok(refunds);
    }

    /// <summary>
    /// Get refund for a specific order (user)
    /// </summary>
    [HttpGet("order/{orderId:guid}")]
    public async Task<ActionResult<RefundResponse>> GetRefundByOrder(Guid orderId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.OrderId == orderId);

        if (refund == null)
            return NotFound(new { message = "Refund not found for this order" });

        // Verify user owns this refund or is admin
        if (refund.RequestedByUserId != userId && !User.IsInRole(Roles.Admin))
            return Forbid();

        return Ok(MapToRefundResponse(refund));
    }

    /// <summary>
    /// Cancel a pending refund request (user)
    /// </summary>
    [HttpPut("{id:guid}/cancel")]
    public async Task<ActionResult<RefundResponse>> CancelRefundRequest(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (refund == null)
            return NotFound(new { message = "Refund not found" });

        if (refund.RequestedByUserId != userId)
            return Forbid();

        // Can only cancel if still in requested status
        if (refund.Status != RefundStatus.Requested)
            return BadRequest(new { message = "Can only cancel refunds that are still in 'Requested' status" });

        // Remove the refund request
        Context.Refunds.Remove(refund);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    // ==================== Admin Endpoints ====================

    /// <summary>
    /// Get all refund requests (admin only)
    /// </summary>
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<RefundWithOrderResponse>>> GetAllRefunds(
        [FromQuery] RefundStatus? status = null
    )
    {
        var query = Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .Include(r => r.Order)
                .ThenInclude(o => o.Items)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        var refunds = await query
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new RefundWithOrderResponse(
                r.Id,
                r.PaymentId,
                r.OrderId,
                r.RequestedByUserId,
                r.RequestedByUser.UserName ?? r.RequestedByUser.Email ?? "Unknown",
                r.ProcessedByUserId,
                r.ProcessedByUser != null ? r.ProcessedByUser.UserName ?? r.ProcessedByUser.Email : null,
                r.RequestedAmount,
                r.ApprovedAmount,
                (RefundReasonDto)r.Reason,
                r.CustomerNotes,
                r.AdminNotes,
                (RefundStatusDto)r.Status,
                r.RequestedAt,
                r.ProcessedAt,
                r.StripeRefundId,
                r.ConversationId,
                r.CreatedAt,
                r.UpdatedAt,
                r.Order.TotalAmount,
                r.Order.Status,
                r.Order.Items.Count
            ))
            .ToListAsync();

        return Ok(refunds);
    }

    /// <summary>
    /// Get a specific refund (admin only)
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<RefundResponse>> GetRefund(Guid id)
    {
        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (refund == null)
            return NotFound(new { message = "Refund not found" });

        return Ok(MapToRefundResponse(refund));
    }

    /// <summary>
    /// Mark refund as under review (admin only)
    /// </summary>
    [HttpPut("{id:guid}/review")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<RefundResponse>> MarkUnderReview(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (refund == null)
            return NotFound(new { message = "Refund not found" });

        if (refund.Status != RefundStatus.Requested)
            return BadRequest(new { message = "Can only mark 'Requested' refunds as under review" });

        refund.Status = RefundStatus.UnderReview;
        refund.ProcessedByUserId = userId;
        await Context.SaveChangesAsync();

        // Reload with navigation properties
        await Context.Entry(refund).Reference(r => r.ProcessedByUser).LoadAsync();

        return Ok(MapToRefundResponse(refund));
    }

    /// <summary>
    /// Approve a refund request (admin only)
    /// </summary>
    [HttpPut("{id:guid}/approve")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<RefundResponse>> ApproveRefund(Guid id, [FromBody] ApproveRefundRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .Include(r => r.Payment)
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (refund == null)
            return NotFound(new { message = "Refund not found" });

        if (refund.Status != RefundStatus.Requested && refund.Status != RefundStatus.UnderReview)
            return BadRequest(new { message = "Can only approve 'Requested' or 'Under Review' refunds" });

        // Use requested amount if no specific amount provided
        var approvedAmount = request.ApprovedAmount ?? refund.RequestedAmount;

        if (approvedAmount <= 0)
            return BadRequest(new { message = "Approved amount must be greater than zero" });

        if (approvedAmount > refund.Payment.Amount)
            return BadRequest(new { message = "Approved amount cannot exceed the payment amount" });

        refund.Status = RefundStatus.Approved;
        refund.ApprovedAmount = approvedAmount;
        refund.AdminNotes = request.AdminNotes;
        refund.ProcessedByUserId = userId;
        refund.ProcessedAt = DateTime.UtcNow;

        // Update order status to RefundApproved
        refund.Order.Status = OrderStatus.RefundApproved;

        await Context.SaveChangesAsync();

        // Send notification to customer
        await _notificationService.CreateNotificationAsync(
            refund.RequestedByUserId,
            NotificationType.RefundApproved,
            "Refund Approved",
            $"Your refund request for Order #{refund.OrderId.ToString()[..8]} has been approved for ${approvedAmount:F2}.",
            refund.ConversationId,
            priority: NotificationPriority.High
        );

        // Add system message to conversation if linked
        if (refund.ConversationId.HasValue)
        {
            await AddSystemMessageToConversation(
                refund.ConversationId.Value,
                $"✅ **Refund Approved**\n\nApproved amount: ${approvedAmount:F2}"
                    + (string.IsNullOrWhiteSpace(request.AdminNotes) ? "" : $"\n\nAdmin notes: {request.AdminNotes}")
            );
        }

        // Reload with navigation properties
        await Context.Entry(refund).Reference(r => r.ProcessedByUser).LoadAsync();

        return Ok(MapToRefundResponse(refund));
    }

    /// <summary>
    /// Reject a refund request (admin only)
    /// </summary>
    [HttpPut("{id:guid}/reject")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<RefundResponse>> RejectRefund(Guid id, [FromBody] RejectRefundRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (refund == null)
            return NotFound(new { message = "Refund not found" });

        if (refund.Status != RefundStatus.Requested && refund.Status != RefundStatus.UnderReview)
            return BadRequest(new { message = "Can only reject 'Requested' or 'Under Review' refunds" });

        refund.Status = RefundStatus.Rejected;
        refund.AdminNotes = request.AdminNotes;
        refund.ProcessedByUserId = userId;
        refund.ProcessedAt = DateTime.UtcNow;

        // Restore order status based on payment status (default to Paid)
        // This could be improved to track the previous status
        refund.Order.Status = OrderStatus.Paid;

        await Context.SaveChangesAsync();

        // Send notification to customer
        await _notificationService.CreateNotificationAsync(
            refund.RequestedByUserId,
            NotificationType.RefundRejected,
            "Refund Rejected",
            $"Your refund request for Order #{refund.OrderId.ToString()[..8]} has been rejected."
                + (string.IsNullOrWhiteSpace(request.AdminNotes) ? "" : $" Reason: {request.AdminNotes}"),
            refund.ConversationId,
            priority: NotificationPriority.High
        );

        // Add system message to conversation if linked
        if (refund.ConversationId.HasValue)
        {
            await AddSystemMessageToConversation(
                refund.ConversationId.Value,
                $"❌ **Refund Rejected**"
                    + (string.IsNullOrWhiteSpace(request.AdminNotes) ? "" : $"\n\nReason: {request.AdminNotes}")
            );
        }

        // Reload with navigation properties
        await Context.Entry(refund).Reference(r => r.ProcessedByUser).LoadAsync();

        return Ok(MapToRefundResponse(refund));
    }

    /// <summary>
    /// Process an approved refund through Stripe (admin only)
    /// </summary>
    [HttpPost("{id:guid}/process")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<RefundResponse>> ProcessRefund(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .Include(r => r.Payment)
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (refund == null)
            return NotFound(new { message = "Refund not found" });

        if (refund.Status != RefundStatus.Approved)
            return BadRequest(new { message = "Can only process approved refunds" });

        if (!refund.ApprovedAmount.HasValue)
            return BadRequest(new { message = "No approved amount set" });

        // Mark as processing
        refund.Status = RefundStatus.Processing;
        await Context.SaveChangesAsync();

        // Process through Stripe
        StripeConfiguration.ApiKey = _stripeSecretKey;

        try
        {
            // Get the checkout session to find the payment intent
            var sessionService = new Stripe.Checkout.SessionService();
            var session = await sessionService.GetAsync(refund.Payment.StripeCheckoutSessionId);

            if (string.IsNullOrEmpty(session.PaymentIntentId))
            {
                refund.Status = RefundStatus.Failed;
                refund.AdminNotes = (refund.AdminNotes ?? "") + "\nFailed: No payment intent found for this session.";
                await Context.SaveChangesAsync();
                return BadRequest(new { message = "No payment intent found for this session" });
            }

            // Create refund
            var refundService = new RefundService();
            var stripeRefund = await refundService.CreateAsync(
                new RefundCreateOptions
                {
                    PaymentIntent = session.PaymentIntentId,
                    Amount = (long)(refund.ApprovedAmount.Value * 100), // Convert to cents
                    Reason = RefundReasons.RequestedByCustomer,
                }
            );

            if (stripeRefund.Status == "succeeded" || stripeRefund.Status == "pending")
            {
                refund.Status = RefundStatus.Completed;
                refund.StripeRefundId = stripeRefund.Id;

                // Update payment status
                refund.Payment.Status = PaymentStatus.Refunded;

                // Update order status to Refunded
                refund.Order.Status = OrderStatus.Refunded;

                await Context.SaveChangesAsync();

                // Send notification to customer
                await _notificationService.CreateNotificationAsync(
                    refund.RequestedByUserId,
                    NotificationType.RefundCompleted,
                    "Refund Completed",
                    $"Your refund of ${refund.ApprovedAmount:F2} for Order #{refund.OrderId.ToString()[..8]} has been processed. The funds will appear in your account within 5-10 business days.",
                    refund.ConversationId,
                    priority: NotificationPriority.High
                );

                // Add system message to conversation if linked
                if (refund.ConversationId.HasValue)
                {
                    await AddSystemMessageToConversation(
                        refund.ConversationId.Value,
                        $"💰 **Refund Processed**\n\nAmount: ${refund.ApprovedAmount:F2}\nThe funds will appear in your account within 5-10 business days."
                    );

                    // Close the conversation
                    var conversation = await Context.Conversations.FindAsync(refund.ConversationId.Value);
                    if (conversation != null)
                    {
                        conversation.Status = ConversationStatus.Resolved;
                        await Context.SaveChangesAsync();
                    }
                }
            }
            else
            {
                refund.Status = RefundStatus.Failed;
                refund.AdminNotes = (refund.AdminNotes ?? "") + $"\nStripe refund status: {stripeRefund.Status}";
                await Context.SaveChangesAsync();
            }

            // Reload with navigation properties
            await Context.Entry(refund).Reference(r => r.ProcessedByUser).LoadAsync();

            return Ok(MapToRefundResponse(refund));
        }
        catch (StripeException ex)
        {
            refund.Status = RefundStatus.Failed;
            refund.AdminNotes = (refund.AdminNotes ?? "") + $"\nStripe error: {ex.Message}";
            await Context.SaveChangesAsync();

            return BadRequest(new { message = $"Refund processing failed: {ex.Message}" });
        }
    }

    /// <summary>
    /// Link a conversation to a refund (admin only)
    /// </summary>
    [HttpPut("{id:guid}/conversation")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<RefundResponse>> LinkConversation(Guid id, [FromBody] Guid conversationId)
    {
        var refund = await Context
            .Refunds.Include(r => r.RequestedByUser)
            .Include(r => r.ProcessedByUser)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (refund == null)
            return NotFound(new { message = "Refund not found" });

        // Verify conversation exists
        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation == null)
            return NotFound(new { message = "Conversation not found" });

        refund.ConversationId = conversationId;
        await Context.SaveChangesAsync();

        return Ok(MapToRefundResponse(refund));
    }

    /// <summary>
    /// Add a system message to a conversation (for refund status updates)
    /// </summary>
    private async Task AddSystemMessageToConversation(Guid conversationId, string content)
    {
        var conversation = await Context
            .Conversations.Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null)
            return;

        // Find the first admin participant, or the customer if no admin
        var participant = conversation.Participants.FirstOrDefault();
        if (participant == null)
            return;

        var message = new ConversationMessage
        {
            ConversationId = conversationId,
            ParticipantId = participant.Id,
            Content = content,
            IsRead = false,
        };

        Context.ConversationMessages.Add(message);
        conversation.LastMessageAt = DateTime.UtcNow;
        conversation.UnreadCount += 1;

        await Context.SaveChangesAsync();

        // Notify via SignalR
        await _hubContext
            .Clients.Group($"conversation:{conversationId}")
            .SendAsync(
                "ReceiveMessage",
                new
                {
                    Id = message.Id,
                    ConversationId = conversationId,
                    Content = content,
                    SenderName = "System",
                    CreatedAt = DateTime.UtcNow,
                }
            );
    }

    private static RefundResponse MapToRefundResponse(Refund refund) =>
        new(
            refund.Id,
            refund.PaymentId,
            refund.OrderId,
            refund.RequestedByUserId,
            refund.RequestedByUser?.UserName ?? refund.RequestedByUser?.Email ?? "Unknown",
            refund.ProcessedByUserId,
            refund.ProcessedByUser?.UserName ?? refund.ProcessedByUser?.Email,
            refund.RequestedAmount,
            refund.ApprovedAmount,
            (RefundReasonDto)refund.Reason,
            refund.CustomerNotes,
            refund.AdminNotes,
            (RefundStatusDto)refund.Status,
            refund.RequestedAt,
            refund.ProcessedAt,
            refund.StripeRefundId,
            refund.ConversationId,
            refund.CreatedAt,
            refund.UpdatedAt
        );

    private static string GetReasonLabel(RefundReason reason) =>
        reason switch
        {
            RefundReason.ChangedMind => "Changed My Mind",
            RefundReason.OrderedByMistake => "Ordered by Mistake",
            RefundReason.FoundBetterPrice => "Found Better Price",
            RefundReason.TooLongToProcess => "Taking Too Long to Process",
            RefundReason.DamagedInShipping => "Damaged in Shipping",
            RefundReason.WrongItemReceived => "Wrong Item Received",
            RefundReason.ItemNotAsDescribed => "Item Not as Described",
            RefundReason.DefectiveProduct => "Defective Product",
            RefundReason.WrongSize => "Wrong Size",
            RefundReason.QualityNotAsExpected => "Quality Not as Expected",
            RefundReason.NeverReceived => "Never Received",
            RefundReason.Other => "Other",
            _ => "Unknown Reason",
        };
}
