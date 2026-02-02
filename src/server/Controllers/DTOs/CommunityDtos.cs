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

// ============ AI Caption DTOs ============

public record GenerateCaptionRequest(
    [Required] Guid PhotoId,
    [StringLength(500)] string? Prompt = null
);

public record GenerateCaptionResponse(
    string Caption
);

// ============ Follow DTOs ============

public record FollowListQuery(int Page = 1, int PageSize = 20);

public record FollowUserResponse(string UserId, string UserName, DateTime FollowedAt);

public record FollowListResponse(
    List<FollowUserResponse> Users,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record FollowStatusResponse(bool IsFollowing, bool IsFollowedBy);

public record FollowCountsResponse(int FollowerCount, int FollowingCount);

// ============ Notification DTOs ============

public record CommunityNotificationResponse(
    Guid Id,
    NotificationType Type,
    string Title,
    string Message,
    bool IsRead,
    DateTime? ReadAt,
    string? ActionUrl,
    DateTime CreatedAt
);

public record NotificationListQuery(int Page = 1, int PageSize = 20, bool? UnreadOnly = null);

public record CommunityNotificationListResponse(
    List<CommunityNotificationResponse> Notifications,
    int TotalCount,
    int UnreadCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record NotificationCountResponse(int TotalCount, int UnreadCount);

// ============ Report DTOs ============

public record CreateReportDto(
    [Required] ReportType ReportType,
    Guid? PostId,
    Guid? CommentId,
    string? ReportedUserId,
    [Required] ReportReason Reason,
    [StringLength(1000)] string? Description
);

public record ReportResponse(
    Guid Id,
    string ReporterId,
    string ReporterName,
    ReportType ReportType,
    Guid? PostId,
    Guid? CommentId,
    string? ReportedUserId,
    ReportReason Reason,
    string? Description,
    ReportStatus Status,
    DateTime CreatedAt
);

public record AdminReportResponse(
    Guid Id,
    string ReporterId,
    string ReporterName,
    ReportType ReportType,
    Guid? PostId,
    Guid? CommentId,
    string? ReportedUserId,
    string? ReportedUserName,
    ReportReason Reason,
    string? Description,
    ReportStatus Status,
    string? AdminNotes,
    string? ReviewedById,
    DateTime CreatedAt,
    DateTime? ReviewedAt
);

public record UpdateReportStatusDto(
    [Required] ReportStatus Status,
    [StringLength(1000)] string? AdminNotes
);

public record ReportListQuery(
    int Page = 1,
    int PageSize = 20,
    ReportStatus? Status = null,
    ReportType? Type = null
);

public record ReportListResponse(
    List<AdminReportResponse> Reports,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

// ============ Block DTOs ============

public record BlockedUserResponse(string UserId, string UserName, DateTime BlockedAt);

public record BlockListQuery(int Page = 1, int PageSize = 20);

public record BlockListResponse(
    List<BlockedUserResponse> Users,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record BlockStatusResponse(bool IsBlocked, bool IsBlockedBy);
