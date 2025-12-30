using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace PrintlyServer.Services;

public class ChatbotService
{
    private readonly HttpClient _http;
    private readonly ILogger<ChatbotService> _logger;

    // Rate limiting: Track last request time per user
    private static readonly ConcurrentDictionary<string, DateTime> _lastRequestTime = new();
    private static readonly ConcurrentDictionary<string, int> _requestCountPerMinute = new();
    private static readonly ConcurrentDictionary<string, DateTime> _minuteWindowStart = new();

    // Configuration constants - SAFETY MEASURES
    private const int MaxRequestsPerMinute = 10; // Max 10 requests per minute per user
    private const int CooldownSeconds = 3; // Minimum 3 seconds between requests
    private const int MaxConversationHistory = 10; // Max messages to keep in context
    private const int MaxTokens = 1000; // Max tokens per response
    private const int RequestTimeoutSeconds = 30; // Request timeout

    // System prompt that defines the chatbot's behavior
    private static readonly string SystemPrompt = """
        You are Printly Assistant, a helpful and friendly AI support chatbot for the Printly application.
        Printly is a print-on-demand design platform where users can:
        
        1. **Designs**: Create, edit, and manage print designs. Users can upload images, use templates, and customize their designs.
        2. **Assets**: Upload and manage images/files that can be used in designs.
        3. **Templates**: Pre-made design templates that users can customize.
        4. **Orders**: Place orders for printed products with their designs.
        5. **Chat/Support**: Get help through the support ticket system or live chat.
        6. **Notifications**: Receive updates about orders, tickets, and system announcements.
        
        Navigation Guide:
        - Dashboard: Overview of recent activity and quick stats
        - Designer: Create and edit designs with drag-and-drop editor
        - Assets: Upload and manage your images and files
        - Orders: View and track your orders
        - Chat: Access support tickets and live chat
        - Notifications: View all your notifications
        
        Guidelines:
        - Be concise and helpful
        - Guide users through the platform features
        - If you don't know something specific, suggest they contact human support
        - Never share or ask for sensitive information like passwords
        - Keep responses focused and under 200 words
        - Use friendly, professional tone
        """;

    public ChatbotService(IConfiguration configuration, ILogger<ChatbotService> logger)
    {
        _logger = logger;

        var apiKey = configuration["OPENROUTER_API_KEY"];
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("OPENROUTER_API_KEY is not configured");
        }

        _http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(RequestTimeoutSeconds)
        };
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.DefaultRequestHeaders.Add("HTTP-Referer", "https://printly.dennise.me");
        _http.DefaultRequestHeaders.Add("X-Title", "Printly Chatbot");
    }

    /// <summary>
    /// Check if user is rate limited
    /// </summary>
    private (bool isLimited, string reason) CheckRateLimit(string userId)
    {
        var now = DateTime.UtcNow;

        // Check cooldown between requests
        if (_lastRequestTime.TryGetValue(userId, out var lastTime))
        {
            var secondsSinceLastRequest = (now - lastTime).TotalSeconds;
            if (secondsSinceLastRequest < CooldownSeconds)
            {
                return (true, $"Please wait {CooldownSeconds - (int)secondsSinceLastRequest} seconds before sending another message.");
            }
        }

        // Check requests per minute
        if (_minuteWindowStart.TryGetValue(userId, out var windowStart))
        {
            if ((now - windowStart).TotalMinutes >= 1)
            {
                // Reset window
                _minuteWindowStart[userId] = now;
                _requestCountPerMinute[userId] = 0;
            }
            else if (_requestCountPerMinute.TryGetValue(userId, out var count) && count >= MaxRequestsPerMinute)
            {
                return (true, $"Rate limit reached. Please wait before sending more messages.");
            }
        }
        else
        {
            _minuteWindowStart[userId] = now;
            _requestCountPerMinute[userId] = 0;
        }

        return (false, string.Empty);
    }

    /// <summary>
    /// Update rate limit tracking after successful request
    /// </summary>
    private void UpdateRateLimit(string userId)
    {
        var now = DateTime.UtcNow;
        _lastRequestTime[userId] = now;
        _requestCountPerMinute.AddOrUpdate(userId, 1, (_, count) => count + 1);
    }

    /// <summary>
    /// Send a message to the chatbot and get a response
    /// </summary>
    public async Task<ChatbotResponse> SendMessageAsync(string userId, string message, List<ChatMessage>? conversationHistory = null)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(message))
        {
            return new ChatbotResponse
            {
                Success = false,
                Error = "Message cannot be empty."
            };
        }

        if (message.Length > 1000)
        {
            return new ChatbotResponse
            {
                Success = false,
                Error = "Message is too long. Please keep it under 1000 characters."
            };
        }

        // Check rate limit
        var (isLimited, reason) = CheckRateLimit(userId);
        if (isLimited)
        {
            return new ChatbotResponse
            {
                Success = false,
                Error = reason,
                IsRateLimited = true
            };
        }

        try
        {
            // Build messages array with system prompt and history
            var messages = new List<object>
            {
                new { role = "system", content = SystemPrompt }
            };

            // Add conversation history (limited to prevent token overflow)
            if (conversationHistory != null)
            {
                var recentHistory = conversationHistory
                    .TakeLast(MaxConversationHistory)
                    .ToList();

                foreach (var msg in recentHistory)
                {
                    messages.Add(new { role = msg.Role, content = msg.Content });
                }
            }

            // Add current user message
            messages.Add(new { role = "user", content = message });

            var requestBody = new
            {
                model = "google/gemini-2.5-flash",
                messages = messages,
                max_tokens = MaxTokens,
                temperature = 0.7
            };

            _logger.LogInformation("Sending chatbot request for user {UserId}", userId);

            var response = await _http.PostAsync(
                "https://openrouter.ai/api/v1/chat/completions",
                new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
            );

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("Chatbot API error: {StatusCode} - {Error}", response.StatusCode, errorBody);

                return new ChatbotResponse
                {
                    Success = false,
                    Error = "I'm having trouble connecting right now. Please try again later."
                };
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseBody);

            var assistantMessage = responseJson
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? string.Empty;

            // Update rate limit tracking after successful request
            UpdateRateLimit(userId);

            _logger.LogInformation("Chatbot response sent for user {UserId}", userId);

            return new ChatbotResponse
            {
                Success = true,
                Message = assistantMessage
            };
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Chatbot request timed out for user {UserId}", userId);
            return new ChatbotResponse
            {
                Success = false,
                Error = "Request timed out. Please try again."
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Chatbot HTTP error for user {UserId}", userId);
            return new ChatbotResponse
            {
                Success = false,
                Error = "Connection error. Please check your internet and try again."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chatbot unexpected error for user {UserId}", userId);
            return new ChatbotResponse
            {
                Success = false,
                Error = "An unexpected error occurred. Please try again later."
            };
        }
    }
}

/// <summary>
/// Response from the chatbot
/// </summary>
public class ChatbotResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? Error { get; set; }
    public bool IsRateLimited { get; set; }
}

/// <summary>
/// A single message in the conversation
/// </summary>
public class ChatMessage
{
    public required string Role { get; set; } // "user" or "assistant"
    public required string Content { get; set; }
}
