using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintlyServer.Data.Entities;

public class UserBlock : BaseEntity
{
    [Required]
    public string BlockerId { get; set; } = null!;

    [ForeignKey(nameof(BlockerId))]
    public User Blocker { get; set; } = null!;

    [Required]
    public string BlockedId { get; set; } = null!;

    [ForeignKey(nameof(BlockedId))]
    public User Blocked { get; set; } = null!;
}
