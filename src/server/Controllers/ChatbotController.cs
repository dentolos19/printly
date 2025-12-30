using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintlyServer.Data;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

/// <summary>
/// Controller for AI-powered support chatbot
/// </summary>
public class ChatbotController(DatabaseContext context, ChatbotService chatbotService) : BaseController(context)
{
    private readonly ChatbotService _chatbotService = chatbotService;

    /// <summary>
    /// Send a message to the chatbot
    /// </summary>
    [Authorize]
    [HttpPost("message")]
    public async Task<IActionResult> SendMessage([FromBody] ChatbotRequest request)
    {
        // Get user ID from claims (same pattern as other controllers)
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "User not authenticated" });
        }

        // Validate request
        if (request == null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { error = "Message is required" });
        }

        // Send message to chatbot service
        var response = await _chatbotService.SendMessageAsync(
            userId,
            request.Message,
            request.History
        );

        if (!response.Success)
        {
            if (response.IsRateLimited)
            {
                return StatusCode(429, new { error = response.Error });
            }
            return BadRequest(new { error = response.Error });
        }

        return Ok(new
        {
            message = response.Message
        });
    }

    /// <summary>
    /// Get chatbot status (for health checks)
    /// </summary>
    [Authorize]
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            available = true,
            features = new[]
            {
                "Multi-turn conversations",
                "Platform navigation help",
                "Feature explanations",
                "General support"
            }
        });
    }
}

/// <summary>
/// Request body for chatbot messages
/// </summary>
public class ChatbotRequest
{
    public required string Message { get; set; }
    public List<ChatMessage>? History { get; set; }
}
