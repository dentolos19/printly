using System.ComponentModel.DataAnnotations;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Controllers.Dtos;

// ============ Post DTOs ============

public record PostResponse(
    Guid Id,
    string AuthorId,
    string AuthorName,
    string Caption,
    Guid PhotoId,
    string PhotoUrl,
    PostVisibility Visibility,
    PostStatus PostStatus,
    int CommentCount,
    int ReactionCount,
    int BookmarkCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record PostDetailResponse(
    Guid Id,
    string AuthorId,
    string AuthorName,
    string Caption,
    Guid PhotoId,
    string PhotoUrl,
    PostVisibility Visibility,
    PostStatus PostStatus,
    List<PostCommentResponse> Comments,
    List<ReactionSummary> Reactions,
    bool IsBookmarked,
    PostReactionType? UserReaction,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record PostSummaryResponse(
    Guid Id,
    string AuthorId,
    string AuthorName,
    string Caption,
    Guid PhotoId,
    string PhotoUrl,
    int CommentCount,
    int ReactionCount,
    bool IsBookmarked,
    PostReactionType? UserReaction,
    DateTime CreatedAt
);

public record CreatePostDto(
    [Required] [StringLength(2000, MinimumLength = 1)] string Caption,
    [Required] Guid PhotoId,
    PostStatus PostStatus = PostStatus.Published
);

public record UpdatePostDto(
    [StringLength(2000, MinimumLength = 1)] string? Caption,
    Guid? PhotoId,
    PostStatus? PostStatus
);

// ============ Comment DTOs ============

public record PostCommentResponse(
    Guid Id,
    Guid PostId,
    string AuthorId,
    string AuthorName,
    string Content,
    Guid? ParentId,
    int ReplyCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record PostCommentDetailResponse(
    Guid Id,
    Guid PostId,
    string AuthorId,
    string AuthorName,
    string Content,
    Guid? ParentId,
    List<PostCommentResponse> Replies,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateCommentDto(
    [Required] Guid PostId,
    [Required] [StringLength(1000, MinimumLength = 1)] string Content,
    Guid? ParentId = null
);

public record UpdateCommentDto(
    [StringLength(1000, MinimumLength = 1)] string? Content
);

// ============ Reaction DTOs ============

public record PostReactionResponse(
    Guid Id,
    Guid PostId,
    string UserId,
    string UserName,
    PostReactionType ReactionType,
    DateTime CreatedAt
);

public record ReactionSummary(
    PostReactionType ReactionType,
    int Count
);

public record CreateReactionDto(
    [Required] Guid PostId,
    [Required] PostReactionType ReactionType
);

public record UpdateReactionDto(
    [Required] PostReactionType ReactionType
);

// ============ Bookmark DTOs ============

public record PostBookmarkResponse(
    Guid Id,
    Guid PostId,
    string UserId,
    DateTime CreatedAt
);

public record BookmarkedPostResponse(
    Guid BookmarkId,
    DateTime BookmarkedAt,
    PostSummaryResponse Post
);

public record CreateBookmarkDto(
    [Required] Guid PostId
);

// ============ Feed/Query DTOs ============

public record PostFeedQuery(
    int Page = 1,
    int PageSize = 20,
    PostStatus? Status = null,
    string? AuthorId = null,
    string? SearchTerm = null
);

public record PostFeedResponse(
    List<PostSummaryResponse> Posts,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

// ============ Stats/Toggle DTOs ============

public record CommunityStatsResponse(
    int TotalPosts,
    int TotalComments,
    int TotalReactions,
    int TotalActiveUsers,
    List<ReactionSummary> TopReactionTypes
);

public record BookmarkToggleResponse(
    bool IsBookmarked,
    string Message
);
