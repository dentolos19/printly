using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintlyServer.Data;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

/// <summary>
/// Controller for AI-powered support chatbot
/// </summary>
public class ChatbotController(DatabaseContext context, ChatService chatbotService) : BaseController(context)
{
    private readonly ChatService _chatbotService = chatbotService;

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
        var response = await _chatbotService.SendMessageAsync(userId, request.Message, request.History);

        if (!response.Success)
        {
            if (response.IsRateLimited)
            {
                return StatusCode(429, new { error = response.Error });
            }
            return BadRequest(new { error = response.Error });
        }

        return Ok(new { message = response.Message });
    }

    /// <summary>
    /// Get chatbot status (for health checks)
    /// </summary>
    [Authorize]
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(
            new
            {
                available = true,
                features = new[]
                {
                    "Multi-turn conversations",
                    "Platform navigation help",
                    "Feature explanations",
                    "General support",
                },
            }
        );
    }

    /// <summary>
    /// Get available AI models for chatbot
    /// </summary>
    [Authorize]
    [HttpGet("models")]
    public IActionResult GetModels()
    {
        var models = new[]
        {
            new
            {
                id = "google/gemini-2.5-flash",
                displayName = "Gemini 2.5 Flash",
                description = "Fast and efficient, great for quick responses",
                isDefault = true,
            },
            new
            {
                id = "openai/gpt-4o",
                displayName = "GPT-4o",
                description = "Advanced reasoning and comprehensive answers",
                isDefault = false,
            },
            new
            {
                id = "anthropic/claude-sonnet-4",
                displayName = "Claude Sonnet 4",
                description = "Balanced performance with nuanced understanding",
                isDefault = false,
            },
            new
            {
                id = "meta-llama/llama-3.1-70b-instruct",
                displayName = "Llama 3.1 70B",
                description = "Open source model with strong capabilities",
                isDefault = false,
            },
        };

        return Ok(new { models });
    }
}

/// <summary>
/// Request body for chatbot messages
/// </summary>
public class ChatbotRequest
{
    public required string Message { get; set; }
    public List<ChatMessage>? History { get; set; }
    public string? Model { get; set; }
}
