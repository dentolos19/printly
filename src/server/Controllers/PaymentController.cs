using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers;

[Route("payments")]
[Authorize]
public class PaymentController(DatabaseContext context, IConfiguration configuration) : BaseController(context)
{
    private readonly string _frontendUrl =
        Environment.GetEnvironmentVariable("APP_URL") ?? configuration["Frontend:Url"] ?? "http://localhost:3000";

    /// <summary>
    /// Complete checkout for an order using the local payment flow.
    /// </summary>
    [HttpPost("checkout")]
    public async Task<ActionResult<CheckoutResponse>> CreateCheckout([FromBody] CreateCheckoutRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var order = await Context.Orders.FirstOrDefaultAsync(o => o.Id == request.OrderId && o.UserId == userId);
        if (order == null)
            return NotFound(new { message = "Order not found" });

        var payment = await Context.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id);
        if (payment?.Status == PaymentStatus.Refunded)
            return BadRequest(new { message = "Refunded orders cannot be paid again" });

        if (payment?.Status == PaymentStatus.Paid && order.Status == OrderStatus.Paid)
            return Ok(new CheckoutResponse($"{_frontendUrl}/checkout/success?payment_id={payment.Id}"));

        if (order.Status != OrderStatus.PendingPayment)
            return BadRequest(new { message = "Order is not pending payment" });

        if (payment == null)
        {
            payment = new Payment
            {
                Amount = order.TotalAmount,
                Currency = "sgd",
                OrderId = order.Id,
            };
            Context.Payments.Add(payment);
        }

        payment.Amount = order.TotalAmount;
        payment.Currency = "sgd";
        payment.Status = PaymentStatus.Pending;
        await Context.SaveChangesAsync();

        return Ok(new CheckoutResponse($"{_frontendUrl}/checkout/{payment.Id}"));
    }

    /// <summary>
    /// Complete a payment from the in-app checkout.
    /// </summary>
    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<PaymentResponse>> CompletePayment(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var payment = await Context.Payments.Include(p => p.Order).FirstOrDefaultAsync(p => p.Id == id);
        if (payment == null)
            return NotFound(new { message = "Payment not found" });

        if (payment.Order.UserId != userId)
            return Forbid();

        if (payment.Status == PaymentStatus.Paid)
            return Ok(MapToPaymentResponse(payment));

        if (payment.Status != PaymentStatus.Pending || payment.Order.Status != OrderStatus.PendingPayment)
            return BadRequest(new { message = "Payment can no longer be completed" });

        payment.Status = PaymentStatus.Paid;
        payment.Order.Status = OrderStatus.Paid;
        await Context.SaveChangesAsync();

        return Ok(MapToPaymentResponse(payment));
    }

    /// <summary>
    /// Verify a locally recorded payment after checkout.
    /// </summary>
    [HttpPost("verify")]
    public async Task<ActionResult<PaymentResponse>> VerifyPayment([FromQuery] Guid paymentId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var payment = await Context.Payments.Include(p => p.Order).FirstOrDefaultAsync(p => p.Id == paymentId);
        if (payment == null)
            return NotFound(new { message = "Payment not found" });

        if (payment.Order.UserId != userId)
            return Forbid();

        return Ok(MapToPaymentResponse(payment));
    }

    /// <summary>
    /// Get payment for a specific order.
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

        if (payment.Order.UserId != userId && !User.IsInRole(Roles.Admin))
            return Forbid();

        return Ok(MapToPaymentResponse(payment));
    }

    /// <summary>
    /// Get all payments for the current user.
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

    /// <summary>
    /// Get all payments.
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
    /// Get a payment.
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PaymentResponse>> GetPayment(Guid id)
    {
        var payment = await Context.Payments.Include(p => p.Order).FirstOrDefaultAsync(p => p.Id == id);
        return payment == null ? NotFound(new { message = "Payment not found" }) : Ok(MapToPaymentResponse(payment));
    }

    /// <summary>
    /// Refund a payment.
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

        payment.Status = PaymentStatus.Refunded;
        payment.Order.Status = OrderStatus.Refunded;
        await Context.SaveChangesAsync();

        return Ok(MapToPaymentResponse(payment));
    }

    private static PaymentResponse MapToPaymentResponse(Payment payment) =>
        new(
            payment.Id,
            payment.OrderId,
            payment.Amount,
            payment.Currency,
            (PaymentStatusDto)payment.Status,
            payment.CreatedAt,
            payment.UpdatedAt
        );
}
