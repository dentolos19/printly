using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;
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

        // Use selected model or default to Gemini 2.5 Flash
        var model = string.IsNullOrWhiteSpace(request.Model) ? "google/gemini-2.5-flash" : request.Model;

        // Save user message to database
        var userMessage = new ChatbotMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Role = "user",
            Content = request.Message,
            Model = null,
            CreatedAt = DateTime.UtcNow,
        };
        Context.ChatbotMessages.Add(userMessage);
        await Context.SaveChangesAsync();

        // Send message to chatbot service
        var response = await _chatbotService.SendMessageAsync(userId, request.Message, request.History, model);

        if (!response.Success)
        {
            if (response.IsRateLimited)
            {
                return StatusCode(429, new { error = response.Error });
            }
            return BadRequest(new { error = response.Error });
        }

        // Save assistant response to database
        var assistantMessage = new ChatbotMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Role = "assistant",
            Content = response.Message ?? string.Empty,
            Model = model,
            CreatedAt = DateTime.UtcNow,
        };
        Context.ChatbotMessages.Add(assistantMessage);
        await Context.SaveChangesAsync();

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

    /// <summary>
    /// Get chat history for the current user
    /// </summary>
    [Authorize]
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int limit = 50)
    {
        // Get user ID from claims
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "User not authenticated" });
        }

        // Fetch user's chat history
        var messages = await Context
            .ChatbotMessages.Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new { role = m.Role, content = m.Content, model = m.Model, timestamp = m.CreatedAt })
            .ToListAsync();

        return Ok(new { messages });
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
