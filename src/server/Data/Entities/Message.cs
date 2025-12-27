using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

/// <summary>
/// Represents a private chat message between two users.
/// </summary>
public class Message : BaseEntity
{
    /// <summary>
    /// The content of the message.
    /// </summary>
    public required string Content { get; set; }

    /// <summary>
    /// The ID of the user who sent the message.
    /// </summary>
    public required string SenderId { get; set; }

    /// <summary>
    /// Navigation property for the sender.
    /// </summary>
    [ForeignKey(nameof(SenderId))]
    public User Sender { get; set; } = null!;

    /// <summary>
    /// The ID of the user who receives the message.
    /// </summary>
    public required string ReceiverId { get; set; }

    /// <summary>
    /// Navigation property for the receiver.
    /// </summary>
    [ForeignKey(nameof(ReceiverId))]
    public User Receiver { get; set; } = null!;
}
