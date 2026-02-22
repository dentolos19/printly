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
    DateTime UpdatedAt,
    List<string> Tags,
    int ShareCount,
    int ViewCount,
    bool IsNsfw,
    string? ContentWarning
);

public record PostSummaryResponse(
    Guid Id,
    string AuthorId,
    string AuthorName,
    string Caption,
    Guid PhotoId,
    string PhotoUrl,
    PostStatus PostStatus,
    int CommentCount,
    int ReactionCount,
    bool IsBookmarked,
    PostReactionType? UserReaction,
    DateTime CreatedAt,
    List<string> Tags,
    int ShareCount,
    int ViewCount,
    bool IsNsfw,
    string? ContentWarning
);

public record CreatePostDto(
    [Required] [StringLength(2000, MinimumLength = 1)] string Caption,
    [Required] Guid PhotoId,
    PostStatus PostStatus = PostStatus.Published,
    List<string>? Tags = null,
    bool IsNsfw = false,
    string? ContentWarning = null
);

public record UpdatePostDto(
    [StringLength(2000, MinimumLength = 1)] string? Caption,
    Guid? PhotoId,
    PostStatus? PostStatus,
    List<string>? Tags = null,
    bool? IsNsfw = null,
    string? ContentWarning = null
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
    DateTime UpdatedAt,
    int ReactionCount = 0,
    PostReactionType? UserReaction = null
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

public record FollowStatusResponse(bool IsFollowing, bool IsFollowedBy, bool HasPendingRequest, bool IsPrivate, Guid? IncomingRequestId);

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

// ============ Tag DTOs ============

public record TagSummaryResponse(string Name, int PostCount);

// ============ Comment Reaction DTOs ============

public record CreateCommentReactionDto(
    [Required] PostReactionType ReactionType
);

// ============ Post Share DTOs ============

public record CreateShareDto(
    string? Caption
);

public record ShareCountResponse(int Count);

// ============ Mute DTOs ============

public record MutedUserResponse(string UserId, string UserName, DateTime MutedAt);

public record MuteListQuery(int Page = 1, int PageSize = 20);

public record MuteListResponse(
    List<MutedUserResponse> Users,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

// ============ Content Flag DTOs ============

public record FlagPostDto(bool IsNsfw, string? ContentWarning);

// ============ Follow Request DTOs ============

public record FollowRequestResponse(
    Guid Id,
    string RequesterId,
    string RequesterName,
    FollowRequestStatus Status,
    DateTime CreatedAt
);

public record FollowRequestListResponse(
    List<FollowRequestResponse> Requests,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

// ============ User Search DTOs ============

public record UserSearchResult(
    string Id,
    string UserName,
    int FollowerCount,
    bool? IsFollowedByMe,
    bool IsPrivate,
    bool HasPendingRequest
);

public record UserSearchQuery(
    string? Q = null,
    int Page = 1,
    int PageSize = 20
);

public record PagedResponse<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

// ============ Push Token DTOs ============

public record RegisterPushTokenDto(
    [Required] string Token,
    [Required] PushPlatform Platform
);

// ============ Notification Preference DTOs ============

public record NotificationPreferenceDto(
    NotificationType Type,
    bool InAppEnabled,
    bool PushEnabled
);

// ============ Post View DTOs ============

// (no extra DTOs needed — upsert is server-side only)

// ============ Analytics DTOs ============

public record DailyCount(DateOnly Date, int Count);

public record PostAnalyticsResponse(
    int ViewCount,
    int UniqueViewers,
    List<ReactionSummary> ReactionBreakdown,
    int CommentCount,
    int ShareCount,
    int BookmarkCount,
    List<DailyCount> ViewsLast7Days
);

public record ProfileStatsResponse(
    int TotalPosts,
    int TotalLikesReceived,
    int TotalCommentsReceived,
    int TotalSharesReceived,
    int FollowerCount,
    int FollowingCount
);

// ============ Admin DTOs ============

public record AdminStatsResponse(
    int TotalUsers,
    int TotalPosts,
    int TotalComments,
    int TotalReactions,
    int TotalReports,
    int PendingReports,
    int PostsToday,
    int NewUsersToday
);

public record AdminUserResponse(
    string Id,
    string UserName,
    int FollowerCount,
    int PostCount,
    int ReportCount,
    bool IsBanned,
    DateTime CreatedAt
);

public record AdminUserListQuery(
    string? Search = null,
    int Page = 1,
    int PageSize = 20
);

public record AdminUserListResponse(
    List<AdminUserResponse> Users,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record BanUserDto(
    [Required] string Reason
);
