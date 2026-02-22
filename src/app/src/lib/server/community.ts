import { ServerFetch } from "@/types";

// Enums matching backend
export enum PostVisibility {
  Visible = 0,
  Hidden = 1,
  Deleted = 2,
}

export enum PostStatus {
  Published = 0,
  Draft = 1,
  Archived = 2,
}

export enum ReactionType {
  Like = 0,
  Love = 1,
  Wow = 2,
}

export enum NotificationType {
  ConversationCreated = 0,
  ConversationAssigned = 1,
  ConversationStatusChanged = 2,
  ConversationPriorityChanged = 3,
  NewMessage = 4,
  ConversationClosed = 5,
  MentionedInMessage = 6,
  AdminJoinedConversation = 7,
  BroadcastSent = 8,
  RefundRequested = 9,
  RefundApproved = 10,
  RefundRejected = 11,
  RefundCompleted = 12,
  NewFollower = 20,
  PostLiked = 21,
  PostCommented = 22,
  CommentReplied = 23,
  Mentioned = 24,
  FollowRequested = 25,
  FollowRequestApproved = 26,
  CommentReacted = 27,
  PostShared = 28,
}

export enum ReportType {
  Post = 0,
  Comment = 1,
  User = 2,
}

export enum ReportStatus {
  Pending = 0,
  Reviewed = 1,
  Resolved = 2,
  Dismissed = 3,
}

export enum ReportReason {
  Spam = 0,
  Harassment = 1,
  HateSpeech = 2,
  Violence = 3,
  Nudity = 4,
  FalseInformation = 5,
  Copyright = 6,
  Other = 7,
}

export enum FollowRequestStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export const ReactionTypeLabels: Record<ReactionType, string> = {
  [ReactionType.Like]: "Like",
  [ReactionType.Love]: "Love",
  [ReactionType.Wow]: "Wow",
};

export const ReactionTypeEmojis: Record<ReactionType, string> = {
  [ReactionType.Like]: "👍",
  [ReactionType.Love]: "❤️",
  [ReactionType.Wow]: "😮",
};

export const PostStatusLabels: Record<PostStatus, string> = {
  [PostStatus.Draft]: "Draft",
  [PostStatus.Published]: "Published",
  [PostStatus.Archived]: "Archived",
};

export const ReportReasonLabels: Record<ReportReason, string> = {
  [ReportReason.Spam]: "Spam",
  [ReportReason.Harassment]: "Harassment",
  [ReportReason.HateSpeech]: "Hate Speech",
  [ReportReason.Violence]: "Violence",
  [ReportReason.Nudity]: "Nudity",
  [ReportReason.FalseInformation]: "False Information",
  [ReportReason.Copyright]: "Copyright",
  [ReportReason.Other]: "Other",
};

export const ReportStatusLabels: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "Pending",
  [ReportStatus.Reviewed]: "Reviewed",
  [ReportStatus.Resolved]: "Resolved",
  [ReportStatus.Dismissed]: "Dismissed",
};

export const ReportTypeLabels: Record<ReportType, string> = {
  [ReportType.Post]: "Post",
  [ReportType.Comment]: "Comment",
  [ReportType.User]: "User",
};

// Types
export type PostSummaryResponse = {
  id: string;
  authorId: string;
  authorName: string;
  caption: string;
  photoId: string;
  photoUrl: string;
  postStatus: PostStatus;
  commentCount: number;
  reactionCount: number;
  isBookmarked: boolean;
  userReaction: ReactionType | null;
  createdAt: string;
  tags: string[];
  shareCount: number;
  viewCount: number;
  isNsfw: boolean;
  contentWarning: string | null;
};

export type PostResponse = {
  id: string;
  authorId: string;
  authorName: string;
  caption: string;
  photoId: string;
  photoUrl: string;
  visibility: PostVisibility;
  postStatus: PostStatus;
  commentCount: number;
  reactionCount: number;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReactionSummary = {
  reactionType: ReactionType;
  count: number;
};

export type PostCommentResponse = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentId: string | null;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  userReaction: ReactionType | null;
};

export type PostDetailResponse = {
  id: string;
  authorId: string;
  authorName: string;
  caption: string;
  photoId: string;
  photoUrl: string;
  visibility: PostVisibility;
  postStatus: PostStatus;
  comments: PostCommentResponse[];
  reactionSummaries: ReactionSummary[];
  isBookmarked: boolean;
  userReaction: ReactionType | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  shareCount: number;
  viewCount: number;
  isNsfw: boolean;
  contentWarning: string | null;
};

export type PostFeedResponse = {
  posts: PostSummaryResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PostReactionResponse = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  reactionType: ReactionType;
  createdAt: string;
};

export type PostBookmarkResponse = {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
};

export type BookmarkedPostResponse = {
  id: string;
  createdAt: string;
  post: PostSummaryResponse;
};

export type BookmarkToggleResponse = {
  isBookmarked: boolean;
  message: string;
};

export type CommunityStatsResponse = {
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  totalUsers: number;
  topReactionTypes: ReactionSummary[];
};

// DTOs
export type CreatePostDto = {
  caption: string;
  photoId: string;
  postStatus: PostStatus;
  tags?: string[];
  isNsfw?: boolean;
  contentWarning?: string;
};

export type UpdatePostDto = {
  caption?: string;
  photoId?: string;
  postStatus?: PostStatus;
  tags?: string[];
  isNsfw?: boolean;
  contentWarning?: string;
};

export type CreateCommentDto = {
  postId: string;
  content: string;
  parentId?: string;
};

export type UpdateCommentDto = {
  content: string;
};

export type CreateReactionDto = {
  postId: string;
  reactionType: ReactionType;
};

export type CreateBookmarkDto = {
  postId: string;
};

// AI Caption Types
export type GenerateCaptionRequest = {
  photoId: string;
  prompt?: string;
};

export type GenerateCaptionResponse = {
  caption: string;
};

export type PostFeedQuery = {
  page?: number;
  pageSize?: number;
  status?: PostStatus;
  authorId?: string;
  searchTerm?: string;
};

// Follow Types
export type FollowUserResponse = {
  userId: string;
  userName: string;
  followedAt: string;
};

export type FollowListResponse = {
  users: FollowUserResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type FollowStatusResponse = {
  isFollowing: boolean;
  isFollowedBy: boolean;
  hasPendingRequest: boolean;
  isPrivate: boolean;
  incomingRequestId: string | null;
};

export type FollowCountsResponse = {
  followerCount: number;
  followingCount: number;
};

export type FollowListQuery = {
  page?: number;
  pageSize?: number;
};

// Notification Types
export type CommunityNotificationResponse = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  createdAt: string;
};

export type CommunityNotificationListResponse = {
  notifications: CommunityNotificationResponse[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type NotificationCountResponse = {
  totalCount: number;
  unreadCount: number;
};

export type NotificationListQuery = {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
};

// Report Types
export type CreateReportDto = {
  reportType: ReportType;
  postId?: string;
  commentId?: string;
  reportedUserId?: string;
  reason: ReportReason;
  description?: string;
};

export type ReportResponse = {
  id: string;
  reporterId: string;
  reporterName: string;
  reportType: ReportType;
  postId: string | null;
  commentId: string | null;
  reportedUserId: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
};

export type AdminReportResponse = {
  id: string;
  reporterId: string;
  reporterName: string;
  reportType: ReportType;
  postId: string | null;
  commentId: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  adminNotes: string | null;
  reviewedById: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type UpdateReportStatusDto = {
  status: ReportStatus;
  adminNotes?: string;
};

export type ReportListQuery = {
  page?: number;
  pageSize?: number;
  status?: ReportStatus;
  type?: ReportType;
};

export type ReportListResponse = {
  reports: AdminReportResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Block Types
export type BlockedUserResponse = {
  userId: string;
  userName: string;
  blockedAt: string;
};

export type BlockListResponse = {
  users: BlockedUserResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type BlockStatusResponse = {
  isBlocked: boolean;
  isBlockedBy: boolean;
};

export type BlockListQuery = {
  page?: number;
  pageSize?: number;
};

// ==================== New Feature Types ====================

// Tag Types
export type TagSummaryResponse = {
  name: string;
  postCount: number;
};

// Comment Reaction Types
export type CommentReactionResponse = {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  reactionType: ReactionType;
  createdAt: string;
};

// Share Types
export type PostShareResponse = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  createdAt: string;
};

export type ShareListResponse = {
  shares: PostShareResponse[];
  totalCount: number;
};

// Mute Types
export type MutedUserResponse = {
  userId: string;
  userName: string;
  mutedAt: string;
};

export type MuteListResponse = {
  users: MutedUserResponse[];
  totalCount: number;
};

// Follow Request Types
export type FollowRequestResponse = {
  id: string;
  requesterId: string;
  requesterName: string;
  createdAt: string;
};

// Notification Preference Types
export type NotificationPreferenceResponse = {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  shares: boolean;
};

export type UpdateNotificationPreferenceDto = {
  likes?: boolean;
  comments?: boolean;
  follows?: boolean;
  mentions?: boolean;
  shares?: boolean;
};

// Analytics Types
export type PostAnalyticsResponse = {
  postId: string;
  viewCount: number;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
};

export type ProfileStatsResponse = {
  totalPosts: number;
  totalViews: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  totalFollowers: number;
  totalFollowing: number;
};

// Admin Types
export type AdminOverviewStatsResponse = {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  totalReports: number;
  flaggedPosts: number;
  bannedUsers: number;
};

export type AdminTrendingTagResponse = {
  name: string;
  postCount: number;
  recentPostCount: number;
};

export type AdminUserResponse = {
  id: string;
  userName: string;
  email: string;
  isBanned: boolean;
  banReason: string | null;
  postCount: number;
  createdAt: string;
};

export type AdminUserListResponse = {
  users: AdminUserResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Search Types
export type UserSearchResponse = {
  id: string;
  userName: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number;
  isFollowing: boolean;
  isPrivate: boolean;
  hasPendingRequest: boolean;
};

export type PagedUserSearchResponse = {
  items: UserSearchResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Helper for building fetch error messages
function buildError(response: Response, fallback: string): Promise<Error> {
  return response
    .json()
    .catch(() => ({ message: fallback }))
    .then((error) =>
      new Error(
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message: string }).message
          : fallback,
      ),
    );
}

export default function initCommunityController(fetch: ServerFetch) {
  return {
    // ==================== Posts ====================

    // Get paginated feed of published posts
    getPosts: async (query?: PostFeedQuery): Promise<PostFeedResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));
      if (query?.status !== undefined) params.append("status", String(query.status));
      if (query?.authorId) params.append("authorId", query.authorId);
      if (query?.searchTerm) params.append("searchTerm", query.searchTerm);

      const url = `/community/posts${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) throw await buildError(response, "Failed to fetch posts");
      return response.json();
    },

    // Get a specific post by ID
    getPost: async (id: string): Promise<PostDetailResponse> => {
      const response = await fetch(`/community/posts/${id}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch post");
      return response.json();
    },

    // Get current user's posts
    getMyPosts: async (status?: PostStatus): Promise<PostSummaryResponse[]> => {
      const params = new URLSearchParams();
      if (status !== undefined) params.append("status", String(status));

      const url = `/community/posts/my${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch your posts");
      return response.json();
    },

    // Create a new post
    createPost: async (data: CreatePostDto): Promise<PostResponse> => {
      const response = await fetch("/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to create post");
      return response.json();
    },

    // Update an existing post
    updatePost: async (id: string, data: UpdatePostDto): Promise<PostResponse> => {
      const response = await fetch(`/community/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to update post");
      return response.json();
    },

    // Soft delete a post
    deletePost: async (id: string): Promise<void> => {
      const response = await fetch(`/community/posts/${id}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to delete post");
    },

    // Get posts by user
    getUserPosts: async (authorId: string): Promise<PostSummaryResponse[]> => {
      const response = await fetch(`/community/users/${authorId}/posts`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch user posts");
      return response.json();
    },

    // Get community stats
    getStats: async (): Promise<CommunityStatsResponse> => {
      const response = await fetch("/community/stats", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch stats");
      return response.json();
    },

    // ==================== AI Features ====================

    // Generate an AI caption for a photo
    generateCaption: async (request: GenerateCaptionRequest): Promise<GenerateCaptionResponse> => {
      const response = await fetch("/community/posts/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw await buildError(response, "Failed to generate caption");
      return response.json();
    },

    // ==================== Comments ====================

    // Get comments for a post
    getComments: async (postId: string): Promise<PostCommentResponse[]> => {
      const response = await fetch(`/community/posts/${postId}/comments`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch comments");
      return response.json();
    },

    // Get replies for a comment
    getReplies: async (commentId: string): Promise<PostCommentResponse[]> => {
      const response = await fetch(`/community/comments/${commentId}/replies`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch replies");
      return response.json();
    },

    // Create a comment
    createComment: async (data: CreateCommentDto): Promise<PostCommentResponse> => {
      const response = await fetch("/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to create comment");
      return response.json();
    },

    // Update a comment
    updateComment: async (id: string, data: UpdateCommentDto): Promise<PostCommentResponse> => {
      const response = await fetch(`/community/comments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to update comment");
      return response.json();
    },

    // Delete a comment
    deleteComment: async (id: string): Promise<void> => {
      const response = await fetch(`/community/comments/${id}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to delete comment");
    },

    // ==================== Comment Reactions ====================

    // React to a comment
    reactToComment: async (commentId: string, reactionType: ReactionType): Promise<CommentReactionResponse> => {
      const response = await fetch(`/community/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
      });
      if (!response.ok) throw await buildError(response, "Failed to react to comment");
      return response.json();
    },

    // Remove comment reaction
    removeCommentReaction: async (commentId: string): Promise<void> => {
      const response = await fetch(`/community/comments/${commentId}/reactions`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to remove comment reaction");
    },

    // ==================== Reactions ====================

    // Get reactions for a post
    getReactions: async (postId: string): Promise<ReactionSummary[]> => {
      const response = await fetch(`/community/posts/${postId}/reactions`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch reactions");
      return response.json();
    },

    // Create or update a reaction
    createOrUpdateReaction: async (data: CreateReactionDto): Promise<PostReactionResponse> => {
      const response = await fetch("/community/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to add reaction");
      return response.json();
    },

    // Remove a reaction
    deleteReaction: async (postId: string): Promise<void> => {
      const response = await fetch(`/community/posts/${postId}/reactions`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to remove reaction");
    },

    // ==================== Bookmarks ====================

    // Get bookmarked posts
    getBookmarks: async (): Promise<BookmarkedPostResponse[]> => {
      const response = await fetch("/community/bookmarks", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch bookmarks");
      return response.json();
    },

    // Create a bookmark
    createBookmark: async (data: CreateBookmarkDto): Promise<PostBookmarkResponse> => {
      const response = await fetch("/community/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to create bookmark");
      return response.json();
    },

    // Toggle bookmark
    toggleBookmark: async (postId: string): Promise<BookmarkToggleResponse> => {
      const response = await fetch(`/community/bookmarks/${postId}/toggle`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to toggle bookmark");
      return response.json();
    },

    // Delete bookmark
    deleteBookmark: async (postId: string): Promise<void> => {
      const response = await fetch(`/community/bookmarks/${postId}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to remove bookmark");
    },

    // ==================== Content Discovery ====================

    // Get trending posts
    getTrendingPosts: async (page = 1, pageSize = 12): Promise<PostFeedResponse> => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/community/posts/trending?${params}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch trending posts");
      return response.json();
    },

    // Get posts by tag
    getPostsByTag: async (tag: string, page = 1, pageSize = 12): Promise<PostFeedResponse> => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/community/tags/${encodeURIComponent(tag)}/posts?${params}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch posts by tag");
      return response.json();
    },

    // Get popular tags
    getPopularTags: async (count = 10): Promise<TagSummaryResponse[]> => {
      const response = await fetch(`/community/tags/popular?limit=${count}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch popular tags");
      return response.json();
    },

    // Get personalized feed
    getPersonalizedFeed: async (page = 1, pageSize = 12): Promise<PostFeedResponse> => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/community/posts/feed?${params}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch personalized feed");
      return response.json();
    },

    // Get explore feed
    getExploreFeed: async (page = 1, pageSize = 12): Promise<PostFeedResponse> => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/community/posts/explore?${params}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch explore feed");
      return response.json();
    },

    // ==================== Shares ====================

    // Share a post
    sharePost: async (postId: string): Promise<PostShareResponse> => {
      const response = await fetch(`/community/posts/${postId}/share`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to share post");
      return response.json();
    },

    // Get post shares
    getPostShares: async (postId: string): Promise<ShareListResponse> => {
      const response = await fetch(`/community/posts/${postId}/shares`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch shares");
      return response.json();
    },

    // ==================== Pinning ====================

    // Pin a post
    pinPost: async (postId: string): Promise<void> => {
      const response = await fetch(`/community/posts/${postId}/pin`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to pin post");
    },

    // Unpin a post
    unpinPost: async (postId: string): Promise<void> => {
      const response = await fetch(`/community/posts/${postId}/pin`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to unpin post");
    },

    // Get pinned posts for a user
    getPinnedPosts: async (userId: string): Promise<PostSummaryResponse[]> => {
      const response = await fetch(`/community/users/${userId}/posts/pinned`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch pinned posts");
      return response.json();
    },

    // ==================== Moderation ====================

    // Flag a post (admin)
    flagPost: async (postId: string, isNsfw: boolean, contentWarning?: string): Promise<void> => {
      const response = await fetch(`/community/admin/posts/${postId}/flag`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNsfw, contentWarning }),
      });
      if (!response.ok) throw await buildError(response, "Failed to flag post");
    },

    // Mute a user
    muteUser: async (userId: string): Promise<void> => {
      const response = await fetch(`/community/mute/${userId}`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to mute user");
    },

    // Unmute a user
    unmuteUser: async (userId: string): Promise<void> => {
      const response = await fetch(`/community/mute/${userId}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to unmute user");
    },

    // Get muted users
    getMutedUsers: async (): Promise<MuteListResponse> => {
      const response = await fetch("/community/mute/list", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch muted users");
      return response.json();
    },

    // ==================== Profile & Social Graph ====================

    // Search users
    searchUsers: async (query: string, page = 1, pageSize = 20): Promise<PagedUserSearchResponse> => {
      const params = new URLSearchParams({ q: query, page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/community/users/search?${params}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to search users");
      return response.json();
    },

    // Get suggested users
    getSuggestedUsers: async (count = 5): Promise<UserSearchResponse[]> => {
      const response = await fetch(`/community/users/suggested?count=${count}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch suggested users");
      return response.json();
    },

    // Get incoming follow requests
    getIncomingFollowRequests: async (): Promise<FollowRequestResponse[]> => {
      const response = await fetch("/community/follow/requests/incoming", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch follow requests");
      return response.json();
    },

    // Approve follow request
    approveFollowRequest: async (requestId: string): Promise<void> => {
      const response = await fetch(`/community/follow/requests/${requestId}/approve`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to approve follow request");
    },

    // Reject follow request
    rejectFollowRequest: async (requestId: string): Promise<void> => {
      const response = await fetch(`/community/follow/requests/${requestId}/reject`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to reject follow request");
    },

    // ==================== Notifications (Push & Preferences) ====================

    // Register push token
    registerPushToken: async (token: string, platform: string): Promise<void> => {
      const response = await fetch("/community/notifications/push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, platform }),
      });
      if (!response.ok) throw await buildError(response, "Failed to register push token");
    },

    // Remove push token
    removePushToken: async (token: string): Promise<void> => {
      const response = await fetch("/community/notifications/push-token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw await buildError(response, "Failed to remove push token");
    },

    // Get notification preferences
    getNotificationPreferences: async (): Promise<NotificationPreferenceResponse> => {
      const response = await fetch("/community/notifications/preferences", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch notification preferences");
      return response.json();
    },

    // Update notification preferences
    updateNotificationPreferences: async (data: UpdateNotificationPreferenceDto): Promise<NotificationPreferenceResponse> => {
      const response = await fetch("/community/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to update notification preferences");
      return response.json();
    },

    // ==================== Analytics ====================

    // Record a post view
    recordPostView: async (postId: string): Promise<void> => {
      const response = await fetch(`/community/posts/${postId}/view`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to record post view");
    },

    // Get post analytics (author only)
    getPostAnalytics: async (postId: string): Promise<PostAnalyticsResponse> => {
      const response = await fetch(`/community/posts/${postId}/analytics`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch post analytics");
      return response.json();
    },

    // Get profile stats
    getProfileStats: async (userId: string): Promise<ProfileStatsResponse> => {
      const response = await fetch(`/community/users/${userId}/stats`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch profile stats");
      return response.json();
    },

    // ==================== Admin ====================

    // [Admin] Get all posts including deleted
    getAdminPosts: async (query?: PostFeedQuery & { visibility?: PostVisibility }): Promise<PostFeedResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));
      if (query?.status !== undefined) params.append("status", String(query.status));
      if (query?.authorId) params.append("authorId", query.authorId);
      if (query?.searchTerm) params.append("searchTerm", query.searchTerm);
      if (query?.visibility !== undefined) params.append("visibility", String(query.visibility));

      const url = `/community/admin/posts${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch posts");
      return response.json();
    },

    // [Admin] Hard delete a post
    hardDeletePost: async (id: string): Promise<void> => {
      const response = await fetch(`/community/posts/${id}/permanent`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to permanently delete post");
    },

    // [Admin] Restore a deleted post
    restorePost: async (id: string): Promise<void> => {
      const response = await fetch(`/community/posts/${id}/restore`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to restore post");
    },

    // [Admin] Delete any comment
    adminDeleteComment: async (id: string): Promise<void> => {
      const response = await fetch(`/community/admin/comments/${id}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to delete comment");
    },

    // [Admin] Get overview stats
    getAdminOverviewStats: async (): Promise<AdminOverviewStatsResponse> => {
      const response = await fetch("/community/admin/stats/overview", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch admin stats");
      return response.json();
    },

    // [Admin] Get trending tags
    getAdminTrendingTags: async (count = 10): Promise<AdminTrendingTagResponse[]> => {
      const response = await fetch(`/community/admin/stats/trending-tags?count=${count}`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch trending tags");
      return response.json();
    },

    // [Admin] Get users list
    getAdminUsers: async (query?: { page?: number; pageSize?: number; searchTerm?: string }): Promise<AdminUserListResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));
      if (query?.searchTerm) params.append("searchTerm", query.searchTerm);

      const url = `/community/admin/users${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch users");
      return response.json();
    },

    // [Admin] Get user posts
    getAdminUserPosts: async (userId: string): Promise<PostSummaryResponse[]> => {
      const response = await fetch(`/community/admin/users/${userId}/posts`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch user posts");
      return response.json();
    },

    // [Admin] Ban a user
    banUser: async (userId: string, reason: string): Promise<void> => {
      const response = await fetch(`/community/admin/users/${userId}/ban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw await buildError(response, "Failed to ban user");
    },

    // [Admin] Unban a user
    unbanUser: async (userId: string): Promise<void> => {
      const response = await fetch(`/community/admin/users/${userId}/ban`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to unban user");
    },

    // ==================== Following ====================

    // Follow a user
    follow: async (userId: string): Promise<void> => {
      const response = await fetch(`/community/follow/${userId}`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to follow user");
    },

    // Unfollow a user
    unfollow: async (userId: string): Promise<void> => {
      const response = await fetch(`/community/follow/${userId}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to unfollow user");
    },

    // Get follow status with a user
    getFollowStatus: async (userId: string): Promise<FollowStatusResponse> => {
      const response = await fetch(`/community/follow/${userId}/status`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to get follow status");
      return response.json();
    },

    // Get followers of a user
    getFollowers: async (userId: string, query?: FollowListQuery): Promise<FollowListResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));

      const url = `/community/follow/${userId}/followers${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch followers");
      return response.json();
    },

    // Get users that a user is following
    getFollowing: async (userId: string, query?: FollowListQuery): Promise<FollowListResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));

      const url = `/community/follow/${userId}/following${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch following");
      return response.json();
    },

    // Get follow counts for a user
    getFollowCounts: async (userId: string): Promise<FollowCountsResponse> => {
      const response = await fetch(`/community/follow/${userId}/counts`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch follow counts");
      return response.json();
    },

    // ==================== Notifications ====================

    // Get community notifications
    getNotifications: async (query?: NotificationListQuery): Promise<CommunityNotificationListResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));
      if (query?.unreadOnly !== undefined) params.append("unreadOnly", String(query.unreadOnly));

      const url = `/community/notifications${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch notifications");
      return response.json();
    },

    // Get notification counts
    getNotificationCount: async (): Promise<NotificationCountResponse> => {
      const response = await fetch("/community/notifications/count", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch notification count");
      return response.json();
    },

    // Mark a notification as read
    markNotificationRead: async (id: string): Promise<void> => {
      const response = await fetch(`/community/notifications/${id}/read`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to mark notification as read");
    },

    // Mark all notifications as read
    markAllNotificationsRead: async (): Promise<void> => {
      const response = await fetch("/community/notifications/read-all", { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to mark all notifications as read");
    },

    // Delete a notification
    deleteNotification: async (id: string): Promise<void> => {
      const response = await fetch(`/community/notifications/${id}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to delete notification");
    },

    // Delete all notifications
    deleteAllNotifications: async (): Promise<void> => {
      const response = await fetch("/community/notifications/all", { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to delete all notifications");
    },

    // ==================== Reports ====================

    // Create a report
    createReport: async (data: CreateReportDto): Promise<ReportResponse> => {
      const response = await fetch("/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to create report");
      return response.json();
    },

    // Get my reports
    getMyReports: async (): Promise<ReportResponse[]> => {
      const response = await fetch("/community/reports/my", { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch your reports");
      return response.json();
    },

    // [Admin] Get all reports
    getAllReports: async (query?: ReportListQuery): Promise<ReportListResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));
      if (query?.status !== undefined) params.append("status", String(query.status));
      if (query?.type !== undefined) params.append("type", String(query.type));

      const url = `/community/admin/reports${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch reports");
      return response.json();
    },

    // [Admin] Update report status
    updateReportStatus: async (id: string, data: UpdateReportStatusDto): Promise<AdminReportResponse> => {
      const response = await fetch(`/community/admin/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw await buildError(response, "Failed to update report status");
      return response.json();
    },

    // ==================== Blocking ====================

    // Block a user
    blockUser: async (userId: string): Promise<void> => {
      const response = await fetch(`/community/block/${userId}`, { method: "POST" });
      if (!response.ok) throw await buildError(response, "Failed to block user");
    },

    // Unblock a user
    unblockUser: async (userId: string): Promise<void> => {
      const response = await fetch(`/community/block/${userId}`, { method: "DELETE" });
      if (!response.ok) throw await buildError(response, "Failed to unblock user");
    },

    // Get block status with a user
    getBlockStatus: async (userId: string): Promise<BlockStatusResponse> => {
      const response = await fetch(`/community/block/${userId}/status`, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to get block status");
      return response.json();
    },

    // Get blocked users
    getBlockedUsers: async (query?: BlockListQuery): Promise<BlockListResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));

      const url = `/community/block/list${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw await buildError(response, "Failed to fetch blocked users");
      return response.json();
    },
  };
}
