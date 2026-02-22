using System.ComponentModel.DataAnnotations;

namespace PrintlyServer.Controllers.Dtos;

public record UserProfileResponse(
    string Id,
    string Email,
    string? DisplayName,
    string? Bio,
    Guid? AvatarId,
    string? Location,
    string? Website,
    DateOnly? DateOfBirth,
    string Role,
    bool HasPassword,
    bool IsPrivate,
    int FollowersCount,
    int FollowingCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record PublicUserProfileResponse(
    string Id,
    string? DisplayName,
    string? Bio,
    Guid? AvatarId,
    string? Location,
    string? Website,
    bool IsPrivate,
    int FollowersCount,
    int FollowingCount,
    bool IsFollowing,
    DateTime CreatedAt
);

public record UpdateProfileDto(
    [StringLength(50, MinimumLength = 1)] string? DisplayName,
    [StringLength(500)] string? Bio,
    Guid? AvatarId,
    [StringLength(100)] string? Location,
    [Url] string? Website,
    DateOnly? DateOfBirth,
    bool? IsPrivate
);

public record UpdateEmailDto([Required] [EmailAddress] string NewEmail, [Required] string Password);

public record UpdatePasswordDto(
    [Required] string CurrentPassword,
    [Required] [StringLength(100, MinimumLength = 8)] string NewPassword
);
