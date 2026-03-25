using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using Stripe;
using Stripe.Checkout;

namespace PrintlyServer.Controllers;

[Route("payments")]
[Authorize]
public class PaymentController(DatabaseContext context, IConfiguration configuration) : BaseController(context)
{
    private readonly string _stripeSecretKey =
        Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY")
        ?? configuration["Stripe:SecretKey"]
        ?? throw new InvalidOperationException("Stripe secret key not configured");

    private readonly string _frontendUrl =
        Environment.GetEnvironmentVariable("APP_URL") ?? configuration["Frontend:Url"] ?? "http://localhost:3000";

    /// <summary>
    /// Create a Stripe checkout session for an order
    /// </summary>
    [HttpPost("checkout")]
    public async Task<ActionResult<CheckoutSessionResponse>> CreateCheckoutSession(
        [FromBody] CreateCheckoutSessionRequest request
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Get the order with items
        var order = await Context
            .Orders.Include(o => o.Items)
                .ThenInclude(i => i.Variant)
                    .ThenInclude(v => v.Product)
            .Include(o => o.Items)
                .ThenInclude(i => i.Imprint)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.UserId == userId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        if (order.Status != OrderStatus.PendingPayment)
            return BadRequest(new { message = "Order is not pending payment" });

        // Check if payment already exists for this order
        var existingPayment = await Context.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id);

        if (existingPayment != null)
        {
            // If payment exists and is pending, return the existing session if it's still valid
            if (
                existingPayment.Status == PaymentStatus.Pending
                && !string.IsNullOrEmpty(existingPayment.StripeCheckoutSessionId)
            )
            {
                try
                {
                    StripeConfiguration.ApiKey = _stripeSecretKey;
                    var sessionService = new SessionService();
                    var existingSession = await sessionService.GetAsync(existingPayment.StripeCheckoutSessionId);

                    // If session is still open, return it
                    if (existingSession.Status == "open")
                    {
                        return Ok(new CheckoutSessionResponse(existingSession.Url, existingSession.Id));
                    }

                    // If session expired, delete the old payment and create new one
                    Context.Payments.Remove(existingPayment);
                    await Context.SaveChangesAsync();
                }
                catch (StripeException)
                {
                    // Session doesn't exist anymore, remove payment and create new one
                    Context.Payments.Remove(existingPayment);
                    await Context.SaveChangesAsync();
                }
            }
            else if (existingPayment.Status == PaymentStatus.Paid)
            {
                return BadRequest(new { message = "Order has already been paid" });
            }
            else
            {
                // Remove failed/cancelled payment to allow retry
                Context.Payments.Remove(existingPayment);
                await Context.SaveChangesAsync();
            }
        }

        // Configure Stripe
        StripeConfiguration.ApiKey = _stripeSecretKey;

        // Build line items from order items
        var lineItems = order
            .Items.Select(item =>
            {
                var customizationPrice = item.Imprint?.CustomizationPrice ?? 0m;
                var unitTotal = item.UnitPrice + customizationPrice;
                var description = $"Size: {item.Variant.Size}, Color: {item.Variant.Color}";
                if (customizationPrice > 0)
                    description += $" + ${customizationPrice:F2} customization";

                return new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "sgd",
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"{item.Variant.Product.Name} ({item.Variant.Size}/{item.Variant.Color})",
                            Description = description,
                        },
                        UnitAmount = (long)(unitTotal * 100), // Stripe expects cents
                    },
                    Quantity = item.Quantity,
                };
            })
            .ToList();

        // Create checkout session
        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems = lineItems,
            Mode = "payment",
            SuccessUrl = $"{_frontendUrl}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{_frontendUrl}/checkout/cancel?order_id={order.Id}",
            Metadata = new Dictionary<string, string> { { "order_id", order.Id.ToString() }, { "user_id", userId } },
            CustomerEmail = User.FindFirstValue(ClaimTypes.Email),
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        // Create payment record
        var payment = new Payment
        {
            OrderId = order.Id,
            StripeCheckoutSessionId = session.Id,
            Amount = order.TotalAmount,
            Currency = "sgd",
            Status = PaymentStatus.Pending,
        };

        Context.Payments.Add(payment);
        await Context.SaveChangesAsync();

        return Ok(new CheckoutSessionResponse(session.Url, session.Id));
    }

    /// <summary>
    /// Verify checkout session and update payment/order status
    /// Called after redirect from Stripe
    /// </summary>
    [HttpPost("verify")]
    public async Task<ActionResult<PaymentResponse>> VerifyCheckoutSession([FromQuery] string sessionId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (string.IsNullOrEmpty(sessionId))
            return BadRequest(new { message = "Session ID is required" });

        // Find payment by session ID
        var payment = await Context
            .Payments.Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.StripeCheckoutSessionId == sessionId);

        if (payment == null)
            return NotFound(new { message = "Payment not found" });

        // Verify user owns this payment
        if (payment.Order.UserId != userId)
            return Forbid();

        // Get session from Stripe
        StripeConfiguration.ApiKey = _stripeSecretKey;
        var service = new SessionService();

        try
        {
            var session = await service.GetAsync(sessionId);

            if (session.PaymentStatus == "paid")
            {
                // Update payment status
                payment.Status = PaymentStatus.Paid;

                // Update order status
                payment.Order.Status = OrderStatus.Paid;

                await Context.SaveChangesAsync();
            }
            else if (session.Status == "expired")
            {
                payment.Status = PaymentStatus.Cancelled;
                await Context.SaveChangesAsync();
            }

            return Ok(MapToPaymentResponse(payment));
        }
        catch (StripeException ex)
        {
            return BadRequest(new { message = $"Failed to verify session: {ex.Message}" });
        }
    }

    /// <summary>
    /// Stripe webhook handler for async payment events
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleWebhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var webhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET");

        try
        {
            Event stripeEvent;

            if (!string.IsNullOrEmpty(webhookSecret))
            {
                var signatureHeader = Request.Headers["Stripe-Signature"];
                stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, webhookSecret);
            }
            else
            {
                // For development without webhook secret
                stripeEvent = EventUtility.ParseEvent(json);
            }

            // Handle the event
            switch (stripeEvent.Type)
            {
                case EventTypes.CheckoutSessionCompleted:
                    var session = stripeEvent.Data.Object as Session;
                    if (session != null)
                    {
                        await HandleCheckoutSessionCompleted(session);
                    }
                    break;

                case EventTypes.CheckoutSessionExpired:
                    var expiredSession = stripeEvent.Data.Object as Session;
                    if (expiredSession != null)
                    {
                        await HandleCheckoutSessionExpired(expiredSession);
                    }
                    break;

                case EventTypes.PaymentIntentPaymentFailed:
                    var failedPayment = stripeEvent.Data.Object as PaymentIntent;
                    if (failedPayment != null)
                    {
                        // Find payment by metadata if available
                        Console.WriteLine($"Payment failed: {failedPayment.Id}");
                    }
                    break;

                default:
                    Console.WriteLine($"Unhandled event type: {stripeEvent.Type}");
                    break;
            }

            return Ok();
        }
        catch (StripeException ex)
        {
            Console.WriteLine($"Stripe webhook error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task HandleCheckoutSessionCompleted(Session session)
    {
        var payment = await Context
            .Payments.Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.StripeCheckoutSessionId == session.Id);

        if (payment == null)
        {
            Console.WriteLine($"Payment not found for session: {session.Id}");
            return;
        }

        if (session.PaymentStatus == "paid")
        {
            payment.Status = PaymentStatus.Paid;
            payment.Order.Status = OrderStatus.Paid;
            await Context.SaveChangesAsync();
            Console.WriteLine($"Payment completed for order: {payment.OrderId}");
        }
    }

    private async Task HandleCheckoutSessionExpired(Session session)
    {
        var payment = await Context
            .Payments.Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.StripeCheckoutSessionId == session.Id);

        if (payment == null)
        {
            Console.WriteLine($"Payment not found for expired session: {session.Id}");
            return;
        }

        payment.Status = PaymentStatus.Cancelled;
        await Context.SaveChangesAsync();
        Console.WriteLine($"Payment cancelled due to session expiry for order: {payment.OrderId}");
    }

    /// <summary>
    /// Get payment for a specific order
    /// </summary>
    [HttpGet("order/{orderId:guid}")]
    public async Task<ActionResult<PaymentResponse>> GetPaymentByOrder(Guid orderId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var payment = await Context.Payments.Include(p => p.Order).FirstOrDefaultAsync(p => p.OrderId == orderId);

        if (payment == null)
            return NotFound(new { message = "Payment not found" });

        // Verify user owns this payment or is admin
        if (payment.Order.UserId != userId && !User.IsInRole(Roles.Admin))
            return Forbid();

        return Ok(MapToPaymentResponse(payment));
    }

    /// <summary>
    /// Get all payments for current user
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<PaymentSummaryResponse>>> GetMyPayments()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var payments = await Context
            .Payments.Include(p => p.Order)
            .Where(p => p.Order.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PaymentSummaryResponse(
                p.Id,
                p.OrderId,
                p.Amount,
                p.Currency,
                (PaymentStatusDto)p.Status,
                p.CreatedAt
            ))
            .ToListAsync();

        return Ok(payments);
    }

    // ==================== Admin Endpoints ====================

    /// <summary>
    /// Get all payments (admin only)
    /// </summary>
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<PaymentResponse>>> GetAllPayments(
        [FromQuery] PaymentStatus? status = null
    )
    {
        var query = Context.Payments.Include(p => p.Order).AsQueryable();

        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);

        var payments = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapToPaymentResponse(p))
            .ToListAsync();

        return Ok(payments);
    }

    /// <summary>
    /// Get a specific payment (admin only)
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PaymentResponse>> GetPayment(Guid id)
    {
        var payment = await Context.Payments.Include(p => p.Order).FirstOrDefaultAsync(p => p.Id == id);

        if (payment == null)
            return NotFound(new { message = "Payment not found" });

        return Ok(MapToPaymentResponse(payment));
    }

    /// <summary>
    /// Refund a payment (admin only)
    /// </summary>
    [HttpPost("{id:guid}/refund")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PaymentResponse>> RefundPayment(Guid id)
    {
        var payment = await Context.Payments.Include(p => p.Order).FirstOrDefaultAsync(p => p.Id == id);

        if (payment == null)
            return NotFound(new { message = "Payment not found" });

        if (payment.Status != PaymentStatus.Paid)
            return BadRequest(new { message = "Only paid payments can be refunded" });

        // Get the checkout session to find the payment intent
        StripeConfiguration.ApiKey = _stripeSecretKey;

        try
        {
            var sessionService = new SessionService();
            var session = await sessionService.GetAsync(payment.StripeCheckoutSessionId);

            if (string.IsNullOrEmpty(session.PaymentIntentId))
                return BadRequest(new { message = "No payment intent found for this session" });

            // Create refund
            var refundService = new RefundService();
            var refund = await refundService.CreateAsync(
                new RefundCreateOptions { PaymentIntent = session.PaymentIntentId }
            );

            if (refund.Status == "succeeded")
            {
                payment.Status = PaymentStatus.Refunded;
                payment.Order.Status = OrderStatus.Cancelled;
                await Context.SaveChangesAsync();
            }

            return Ok(MapToPaymentResponse(payment));
        }
        catch (StripeException ex)
        {
            return BadRequest(new { message = $"Refund failed: {ex.Message}" });
        }
    }

    private static PaymentResponse MapToPaymentResponse(Payment payment) =>
        new(
            payment.Id,
            payment.OrderId,
            payment.StripeCheckoutSessionId,
            payment.Amount,
            payment.Currency,
            (PaymentStatusDto)payment.Status,
            payment.CreatedAt,
            payment.UpdatedAt
        );
}
