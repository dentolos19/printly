using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Services;

public class ChatService
{
    private readonly HttpClient _http;
    private readonly ILogger<ChatService> _logger;
    private readonly DatabaseContext _context;
    private readonly INotificationService _notificationService;

    // Rate limiting: Track last request time per user
    private static readonly ConcurrentDictionary<string, DateTime> _lastRequestTime = new();
    private static readonly ConcurrentDictionary<string, int> _requestCountPerMinute = new();
    private static readonly ConcurrentDictionary<string, DateTime> _minuteWindowStart = new();

    // Configuration constants - SAFETY MEASURES
    private const int MaxRequestsPerMinute = 10; // Max 10 requests per minute per user
    private const int CooldownSeconds = 3; // Minimum 3 seconds between requests
    private const int MaxConversationHistory = 10; // Max messages to keep in context
    private const int MaxTokens = 1500; // Max tokens per response (increased for tool calling)
    private const int RequestTimeoutSeconds = 30; // Request timeout
    private const int MaxToolCallRoundTrips = 3; // Max tool call round trips to prevent infinite loops

    // supported ai models - users can choose from these options
    private static readonly HashSet<string> SupportedModels =
    [
        "google/gemini-2.5-flash", // Default - fast and efficient
        "openai/gpt-4o", // Advanced reasoning
        "meta-llama/llama-3.1-70b-instruct", // Open source option
    ];

    private const string DefaultModel = "google/gemini-2.5-flash";

    // system prompt that defines the chatbot's behavior
    private static readonly string SystemPrompt = """
        You are Printly Assistant, a helpful and knowledgeable AI support chatbot for the Printly application.
        Printly is a comprehensive print-on-demand design platform where users can create custom designs, order printed products, and connect with a creative community.

        **Platform Features:**

        1. **Dashboard**:
           - Overview of your recent activity and quick stats
           - Shortcuts to frequently used features
           - Summary of pending orders and notifications

        2. **Library (Designs & Assets)**:
           - View and manage all your saved designs
           - Upload and organize images, logos, and graphics
           - Supported formats: PNG, JPG, SVG, PDF
           - Reuse assets across multiple designs

        3. **Designer Tool** (accessible via /designer):
           - Create and edit custom print designs using our interactive canvas
           - Drag-and-drop interface with layers and tools
           - Save drafts and revisions of your work
           - Export designs in various formats

        4. **Imprinter Tool** (accessible via /imprinter):
           - Apply your designs to product mockups
           - Preview how designs look on t-shirts, mugs, posters, and more
           - Adjust positioning and scaling

        5. **Orders**:
           - Browse products and place orders for physical printed items
           - Track order status: Pending → Paid → Processing → Shipped → Delivered
           - View order history and order details
           - Request refunds for eligible orders (paid, shipped, or delivered)
           - Download invoices and receipts

        6. **Refunds**:
           - Request refunds for orders that qualify
           - Track refund status: Requested → Under Review → Approved → Processing → Completed
           - Receive notifications when refund status changes
           - Refunds are processed back to original payment method (Stripe)

        7. **Community**:
           - Share your designs with the community by creating posts
           - Browse and discover designs from other creators
           - React to posts (like, love, celebrate, etc.)
           - Comment on posts and engage with other users
           - Bookmark favorite posts for later
           - View community stats and leaderboards

        8. **Chat & Support**:
           - Real-time messaging with support staff
           - Start new support conversations
           - Send text messages, file attachments, and voice messages
           - Edit and delete your messages
           - Reply to specific messages
           - See typing indicators and read receipts
           - **Voice & Video Calls**: Start audio or video calls with support staff using LiveKit

        9. **Notifications**:
           - Real-time notifications for important updates
           - Order status changes and shipping updates
           - New message alerts from support
           - Refund status updates
           - Community interactions (comments, reactions on your posts)
           - Mark notifications as read or archive them

        **Navigation:**
        - **Dashboard** (/dashboard): Your home base with activity overview
        - **Library** (/library): Manage your designs and assets
        - **Orders** (/orders): View and track your orders
        - **Community** (/community): Social feed and community posts
        - **Chat** (/chat): Real-time messaging with support
        - **Account** (/account): Profile and account settings
        - **Notifications** (/notifications): View all your notifications

        **Common Questions You Can Help With:**
        - How to create, edit, or manage designs
        - How to upload and organize assets in your library
        - How to place orders and track their status
        - How to request a refund and track its progress
        - How to share designs in the community
        - How to interact with community posts (react, comment, bookmark)
        - How to use the chat feature and contact support
        - How to start voice or video calls with support
        - How to manage notifications
        - Account and profile settings
        - Payment and checkout questions (we use Stripe)
        - Design best practices and tips

        **Your Behavior:**
        - Be friendly, conversational, and helpful
        - Provide clear, step-by-step instructions when needed
        - Use markdown formatting for better readability (bold, lists, etc.)
        - Keep responses concise but informative (aim for 150-250 words)
        - If you're unsure about something specific, acknowledge it and suggest contacting support via the Chat feature
        - Never ask for or share sensitive information like passwords or payment details
        - Maintain a professional yet approachable tone
        - When explaining features, give practical examples with navigation paths
        - Proactively offer related tips or features that might help the user
        - For urgent issues, recommend starting a support conversation in the Chat section

        **Tool Usage - Taking Actions:**
        You have the ability to take real actions on behalf of the user using tools. Here are your guidelines:

        - When a user wants to create a support ticket, report an issue, or talk to a human agent, use the `create_support_ticket` tool. Formulate a clear subject and summarize the user's issue in the message.
        - When a user asks about a specific order, use `check_order_status` to look it up.
        - When a user asks about their orders generally, use `list_recent_orders`.
        - After using a tool successfully, confirm to the user what happened and tell them where to find it (e.g., "You can find your new support ticket in the **Chat** page at /chat").
        - If a tool fails, apologize and suggest the user try the manual approach (e.g., "You can create a ticket manually from the Chat page").
        - Do NOT ask the user for confirmation before creating a support ticket - just do it when they ask. The ticket creation itself is not destructive and they can always continue the conversation with support.
        - Always be helpful and let the user know exactly what you did.
        """;

    public ChatService(
        IConfiguration configuration,
        ILogger<ChatService> logger,
        DatabaseContext context,
        INotificationService notificationService
    )
    {
        _logger = logger;
        _context = context;
        _notificationService = notificationService;

        var apiKey = configuration["OPENROUTER_API_KEY"];
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("OPENROUTER_API_KEY is not configured");
        }

        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(RequestTimeoutSeconds) };
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.DefaultRequestHeaders.Add("HTTP-Referer", "https://printly.dennise.me");
        _http.DefaultRequestHeaders.Add("X-Title", "Printly");
    }

    /// <summary>
    /// Get tool definitions for OpenRouter function calling (OpenAI format)
    /// </summary>
    private static object[] GetToolDefinitions() =>
        [
            new
            {
                type = "function",
                function = new
                {
                    name = "create_support_ticket",
                    description = "Create a new support conversation/ticket for the currently signed-in user. Use this when the user wants to talk to a real support agent, report an issue, ask about an order, or needs human help. The ticket will appear in their Chat page where support staff can respond.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            subject = new
                            {
                                type = "string",
                                description = "A short subject line for the ticket, like 'Order Issue - Missing Item' or 'Billing Question'",
                            },
                            message = new
                            {
                                type = "string",
                                description = "The initial message describing the user's issue in detail. Summarize what the user told you.",
                            },
                            priority = new
                            {
                                type = "string",
                                @enum = new[] { "low", "normal", "high", "urgent" },
                                description = "Priority level. Use 'high' for order/payment issues, 'urgent' only for time-sensitive problems, 'normal' for general questions.",
                            },
                        },
                        required = new[] { "subject", "message" },
                    },
                },
            },
            new
            {
                type = "function",
                function = new
                {
                    name = "check_order_status",
                    description = "Look up the status and details of one of the user's orders. Only works for orders belonging to the currently signed-in user.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            order_id = new { type = "string", description = "The order ID (GUID format) to look up" },
                        },
                        required = new[] { "order_id" },
                    },
                },
            },
            new
            {
                type = "function",
                function = new
                {
                    name = "list_recent_orders",
                    description = "List the user's most recent orders with their statuses. Use when the user asks about their orders but doesn't specify which one.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            count = new
                            {
                                type = "integer",
                                description = "Number of recent orders to return. Default 5, max 10.",
                            },
                        },
                    },
                },
            },
        ];

    /// <summary>
    /// Execute a tool call and return the JSON result string
    /// </summary>
    private async Task<(string result, ToolAction? action)> ExecuteToolAsync(
        string toolName,
        string argumentsJson,
        string userId
    )
    {
        try
        {
            var args = JsonSerializer.Deserialize<JsonElement>(argumentsJson);

            switch (toolName)
            {
                case "create_support_ticket":
                    return await ExecuteCreateSupportTicketAsync(args, userId);
                case "check_order_status":
                    return await ExecuteCheckOrderStatusAsync(args, userId);
                case "list_recent_orders":
                    return await ExecuteListRecentOrdersAsync(args, userId);
                default:
                    _logger.LogWarning("Unknown tool called: {ToolName}", toolName);
                    return (
                        JsonSerializer.Serialize(new { success = false, error = $"Unknown tool: {toolName}" }),
                        null
                    );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing tool {ToolName} for user {UserId}", toolName, userId);
            return (
                JsonSerializer.Serialize(
                    new { success = false, error = "An error occurred while executing the action." }
                ),
                null
            );
        }
    }

    /// <summary>
    /// Execute the create_support_ticket tool
    /// </summary>
    private async Task<(string result, ToolAction? action)> ExecuteCreateSupportTicketAsync(
        JsonElement args,
        string userId
    )
    {
        var subject = args.GetProperty("subject").GetString() ?? "Support Request";
        var messageContent = args.GetProperty("message").GetString() ?? "";
        var priorityStr = args.TryGetProperty("priority", out var p) ? p.GetString() ?? "normal" : "normal";

        var priority = priorityStr.ToLowerInvariant() switch
        {
            "low" => ConversationPriority.Low,
            "high" => ConversationPriority.High,
            "urgent" => ConversationPriority.Urgent,
            _ => ConversationPriority.Normal,
        };

        var user = await _context.Users.FindAsync(userId);
        if (user is null)
        {
            return (JsonSerializer.Serialize(new { success = false, error = "User not found." }), null);
        }

        // Create the conversation
        var conversation = new Conversation
        {
            Subject = subject.Trim(),
            CustomerId = userId,
            SupportMode = true,
            Status = ConversationStatus.Pending,
            Priority = priority,
        };
        _context.Conversations.Add(conversation);

        // Add the customer as participant
        var customerParticipant = new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId = userId,
            Role = ConversationParticipantRole.Member,
        };
        _context.ConversationParticipants.Add(customerParticipant);

        await _context.SaveChangesAsync();

        // Add the initial message
        if (!string.IsNullOrWhiteSpace(messageContent))
        {
            var message = new ConversationMessage
            {
                ConversationId = conversation.Id,
                ParticipantId = customerParticipant.Id,
                Content = messageContent.Trim(),
                IsRead = false,
            };
            _context.ConversationMessages.Add(message);
            conversation.LastMessageAt = DateTime.UtcNow;
            conversation.UnreadCount = 1;
            await _context.SaveChangesAsync();
        }

        // Notify admins
        await _notificationService.NotifyAdminsAsync(
            NotificationType.ConversationCreated,
            "New Support Conversation",
            $"{user.UserName ?? user.Email} started a conversation: {subject}",
            conversation.Id,
            priority switch
            {
                ConversationPriority.High => NotificationPriority.High,
                ConversationPriority.Urgent => NotificationPriority.Urgent,
                _ => NotificationPriority.Normal,
            }
        );

        _logger.LogInformation(
            "Support ticket created via AI tool for user {UserId}: {ConversationId}",
            userId,
            conversation.Id
        );

        var action = new ToolAction
        {
            Type = "create_support_ticket",
            ConversationId = conversation.Id.ToString(),
            Subject = subject,
        };

        var result = JsonSerializer.Serialize(
            new
            {
                success = true,
                conversationId = conversation.Id.ToString(),
                subject,
                message = "Ticket created successfully. The user can find it in their Chat page at /chat",
            }
        );

        return (result, action);
    }

    /// <summary>
    /// Execute the check_order_status tool
    /// </summary>
    private async Task<(string result, ToolAction? action)> ExecuteCheckOrderStatusAsync(
        JsonElement args,
        string userId
    )
    {
        var orderIdStr = args.GetProperty("order_id").GetString() ?? "";

        if (!Guid.TryParse(orderIdStr, out var orderId))
        {
            return (JsonSerializer.Serialize(new { success = false, error = "Invalid order ID format." }), null);
        }

        var order = await _context
            .Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

        if (order is null)
        {
            return (
                JsonSerializer.Serialize(
                    new { success = false, error = "Order not found or you don't have access to it." }
                ),
                null
            );
        }

        var result = JsonSerializer.Serialize(
            new
            {
                success = true,
                order = new
                {
                    id = order.Id.ToString(),
                    status = order.Status.ToString(),
                    totalAmount = order.TotalAmount,
                    itemCount = order.Items.Count,
                    createdAt = order.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                },
            }
        );

        return (result, null);
    }

    /// <summary>
    /// Execute the list_recent_orders tool
    /// </summary>
    private async Task<(string result, ToolAction? action)> ExecuteListRecentOrdersAsync(
        JsonElement args,
        string userId
    )
    {
        var count = args.TryGetProperty("count", out var c) ? c.GetInt32() : 5;
        count = Math.Clamp(count, 1, 10);

        var orders = await _context
            .Orders.Where(o => o.UserId == userId)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Take(count)
            .ToListAsync();

        if (orders.Count == 0)
        {
            return (
                JsonSerializer.Serialize(
                    new
                    {
                        success = true,
                        orders = Array.Empty<object>(),
                        message = "No orders found.",
                    }
                ),
                null
            );
        }

        var result = JsonSerializer.Serialize(
            new
            {
                success = true,
                orders = orders.Select(o => new
                {
                    id = o.Id.ToString(),
                    status = o.Status.ToString(),
                    totalAmount = o.TotalAmount,
                    itemCount = o.Items.Count,
                    createdAt = o.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                }),
            }
        );

        return (result, null);
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
                return (
                    true,
                    $"Please wait {CooldownSeconds - (int)secondsSinceLastRequest} seconds before sending another message."
                );
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
    /// Make a request to the OpenRouter API and return the parsed response
    /// </summary>
    private async Task<JsonElement> CallOpenRouterAsync(object requestBody)
    {
        var response = await _http.PostAsync(
            "https://openrouter.ai/api/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"OpenRouter API error: {response.StatusCode} - {errorBody}");
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(responseBody);
    }

    /// <summary>
    /// Send a message to the chatbot and get a response, with tool calling support
    /// </summary>
    public async Task<ChatbotResponse> SendMessageAsync(
        string userId,
        string message,
        List<ChatMessage>? conversationHistory = null,
        string? model = null
    )
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(message))
        {
            return new ChatbotResponse { Success = false, Error = "Message cannot be empty." };
        }

        if (message.Length > 1000)
        {
            return new ChatbotResponse
            {
                Success = false,
                Error = "Message is too long. Please keep it under 1000 characters.",
            };
        }

        // Validate and set model
        var selectedModel = string.IsNullOrWhiteSpace(model) ? DefaultModel : model;

        if (!SupportedModels.Contains(selectedModel))
        {
            _logger.LogWarning("Invalid model requested: {Model}. Using default.", selectedModel);
            selectedModel = DefaultModel;
        }

        // Check rate limit
        var (isLimited, reason) = CheckRateLimit(userId);
        if (isLimited)
        {
            return new ChatbotResponse
            {
                Success = false,
                Error = reason,
                IsRateLimited = true,
            };
        }

        try
        {
            // Build messages array with system prompt and history
            var messages = new List<object> { new { role = "system", content = SystemPrompt } };

            // Add conversation history (limited to prevent token overflow)
            if (conversationHistory != null)
            {
                var recentHistory = conversationHistory.TakeLast(MaxConversationHistory).ToList();

                foreach (var msg in recentHistory)
                {
                    messages.Add(new { role = msg.Role, content = msg.Content });
                }
            }

            // Add current user message
            messages.Add(new { role = "user", content = message });

            var tools = GetToolDefinitions();
            var actions = new List<ToolAction>();

            // Tool calling loop - may require multiple round trips
            for (var round = 0; round < MaxToolCallRoundTrips; round++)
            {
                var requestBody = new
                {
                    model = selectedModel,
                    messages,
                    max_tokens = MaxTokens,
                    temperature = 0.7,
                    tools,
                };

                _logger.LogInformation(
                    "Sending chatbot request for user {UserId} with model {Model} (round {Round})",
                    userId,
                    selectedModel,
                    round
                );

                var responseJson = await CallOpenRouterAsync(requestBody);

                var choice = responseJson.GetProperty("choices")[0];
                var assistantMsg = choice.GetProperty("message");

                // Check if the model wants to call tools
                var hasToolCalls =
                    assistantMsg.TryGetProperty("tool_calls", out var toolCallsElement)
                    && toolCallsElement.ValueKind == JsonValueKind.Array
                    && toolCallsElement.GetArrayLength() > 0;

                if (!hasToolCalls)
                {
                    // No tool calls - extract text content and return
                    var content = assistantMsg.TryGetProperty("content", out var contentEl)
                        ? contentEl.GetString() ?? string.Empty
                        : string.Empty;

                    UpdateRateLimit(userId);
                    _logger.LogInformation("Chatbot response sent for user {UserId}", userId);

                    return new ChatbotResponse
                    {
                        Success = true,
                        Message = content,
                        Actions = actions.Count > 0 ? actions : null,
                    };
                }

                // Model wants to call tools - add the assistant message (with tool_calls) to messages
                // We need to serialize this properly for the next API call
                var assistantMsgDict = new Dictionary<string, object?> { ["role"] = "assistant" };

                // Include content if present (some models return text + tool calls)
                if (
                    assistantMsg.TryGetProperty("content", out var assistantContent)
                    && assistantContent.ValueKind != JsonValueKind.Null
                )
                {
                    assistantMsgDict["content"] = assistantContent.GetString();
                }
                else
                {
                    assistantMsgDict["content"] = null;
                }

                // Include tool_calls
                var toolCallsList = new List<object>();
                foreach (var tc in toolCallsElement.EnumerateArray())
                {
                    toolCallsList.Add(
                        new
                        {
                            id = tc.GetProperty("id").GetString(),
                            type = "function",
                            function = new
                            {
                                name = tc.GetProperty("function").GetProperty("name").GetString(),
                                arguments = tc.GetProperty("function").GetProperty("arguments").GetString(),
                            },
                        }
                    );
                }
                assistantMsgDict["tool_calls"] = toolCallsList;
                messages.Add(assistantMsgDict);

                // Execute each tool call and collect results
                foreach (var toolCall in toolCallsElement.EnumerateArray())
                {
                    var toolCallId = toolCall.GetProperty("id").GetString()!;
                    var functionName = toolCall.GetProperty("function").GetProperty("name").GetString()!;
                    var functionArgs = toolCall.GetProperty("function").GetProperty("arguments").GetString()!;

                    _logger.LogInformation("Executing tool {ToolName} for user {UserId}", functionName, userId);

                    var (toolResult, action) = await ExecuteToolAsync(functionName, functionArgs, userId);

                    if (action != null)
                    {
                        actions.Add(action);
                    }

                    // Add tool result message for the next round trip
                    messages.Add(
                        new
                        {
                            role = "tool",
                            tool_call_id = toolCallId,
                            content = toolResult,
                        }
                    );
                }

                // Continue the loop - the next iteration will send messages + tool results back
            }

            // If we exhausted all rounds, extract whatever content we have
            _logger.LogWarning(
                "Tool call loop exhausted {MaxRounds} rounds for user {UserId}",
                MaxToolCallRoundTrips,
                userId
            );

            UpdateRateLimit(userId);

            return new ChatbotResponse
            {
                Success = true,
                Message = "I've completed the actions. Is there anything else I can help you with?",
                Actions = actions.Count > 0 ? actions : null,
            };
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Chatbot request timed out for user {UserId}", userId);
            return new ChatbotResponse { Success = false, Error = "Request timed out. Please try again." };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Chatbot HTTP error for user {UserId}", userId);
            return new ChatbotResponse
            {
                Success = false,
                Error = "I'm having trouble connecting right now. Please try again later.",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chatbot unexpected error for user {UserId}", userId);
            return new ChatbotResponse
            {
                Success = false,
                Error = "An unexpected error occurred. Please try again later.",
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
    public List<ToolAction>? Actions { get; set; }
}

/// <summary>
/// Metadata about a tool action that was executed
/// </summary>
public class ToolAction
{
    public required string Type { get; set; }
    public string? ConversationId { get; set; }
    public string? Subject { get; set; }
}

/// <summary>
/// A single message in the conversation
/// </summary>
public class ChatMessage
{
    public required string Role { get; set; } // "user" or "assistant"
    public required string Content { get; set; }
}
