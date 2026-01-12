using System.ComponentModel.DataAnnotations;

namespace PrintlyServer.Data.Entities;

/// <summary>
/// Represents a single message in a chatbot conversation
/// </summary>
public class ChatbotMessage : BaseEntity
{
    /// <summary>
    /// ID of the user who owns this conversation
    /// </summary>
    [Required]
    public required string UserId { get; set; }

    /// <summary>
    /// Role of the message sender - either "user" or "assistant"
    /// </summary>
    [Required]
    [MaxLength(20)]
    public required string Role { get; set; }

    /// <summary>
    /// The actual message content
    /// </summary>
    [Required]
    public required string Content { get; set; }

    /// <summary>
    /// The AI model used for this message (only relevant for assistant messages)
    /// </summary>
    [MaxLength(100)]
    public string? Model { get; set; }
}
