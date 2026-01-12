import { ServerFetch } from "@/types";

// Enums matching backend
export enum PostVisibility {
  Visible = 0,
  Hidden = 1,
  Deleted = 2,
}

export enum PostStatus {
  Draft = 0,
  Published = 1,
  Archived = 2,
}

export enum ReactionType {
  Like = 0,
  Love = 1,
  Laugh = 2,
  Wow = 3,
  Sad = 4,
  Angry = 5,
}

export const ReactionTypeLabels: Record<ReactionType, string> = {
  [ReactionType.Like]: "Like",
  [ReactionType.Love]: "Love",
  [ReactionType.Laugh]: "Laugh",
  [ReactionType.Wow]: "Wow",
  [ReactionType.Sad]: "Sad",
  [ReactionType.Angry]: "Angry",
};

export const ReactionTypeEmojis: Record<ReactionType, string> = {
  [ReactionType.Like]: "👍",
  [ReactionType.Love]: "❤️",
  [ReactionType.Laugh]: "😂",
  [ReactionType.Wow]: "😮",
  [ReactionType.Sad]: "😢",
  [ReactionType.Angry]: "😠",
};

export const PostStatusLabels: Record<PostStatus, string> = {
  [PostStatus.Draft]: "Draft",
  [PostStatus.Published]: "Published",
  [PostStatus.Archived]: "Archived",
};

// Types
export type PostSummaryResponse = {
  id: string;
  authorId: string;
  authorName: string;
  caption: string;
  photoId: string;
  photoUrl: string;
  commentCount: number;
  reactionCount: number;
  isBookmarked: boolean;
  userReaction: ReactionType | null;
  createdAt: string;
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
};

export type UpdatePostDto = {
  caption?: string;
  photoId?: string;
  postStatus?: PostStatus;
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

export type PostFeedQuery = {
  page?: number;
  pageSize?: number;
  status?: PostStatus;
  authorId?: string;
  searchTerm?: string;
};

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

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch posts" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch posts"
        );
      }

      return response.json();
    },

    // Get a specific post by ID
    getPost: async (id: string): Promise<PostDetailResponse> => {
      const response = await fetch(`/community/posts/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch post" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch post"
        );
      }

      return response.json();
    },

    // Get current user's posts
    getMyPosts: async (status?: PostStatus): Promise<PostSummaryResponse[]> => {
      const params = new URLSearchParams();
      if (status !== undefined) params.append("status", String(status));

      const url = `/community/posts/my${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch your posts" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch your posts"
        );
      }

      return response.json();
    },

    // Create a new post
    createPost: async (data: CreatePostDto): Promise<PostResponse> => {
      const response = await fetch("/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create post" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to create post"
        );
      }

      return response.json();
    },

    // Update an existing post
    updatePost: async (id: string, data: UpdatePostDto): Promise<PostResponse> => {
      const response = await fetch(`/community/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update post" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to update post"
        );
      }

      return response.json();
    },

    // Soft delete a post
    deletePost: async (id: string): Promise<void> => {
      const response = await fetch(`/community/posts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete post" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to delete post"
        );
      }
    },

    // Get posts by user
    getUserPosts: async (authorId: string): Promise<PostSummaryResponse[]> => {
      const response = await fetch(`/community/users/${authorId}/posts`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch user posts" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch user posts"
        );
      }

      return response.json();
    },

    // Get community stats
    getStats: async (): Promise<CommunityStatsResponse> => {
      const response = await fetch("/community/stats", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch stats" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch stats"
        );
      }

      return response.json();
    },

    // ==================== Comments ====================

    // Get comments for a post
    getComments: async (postId: string): Promise<PostCommentResponse[]> => {
      const response = await fetch(`/community/posts/${postId}/comments`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch comments" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch comments"
        );
      }

      return response.json();
    },

    // Get replies for a comment
    getReplies: async (commentId: string): Promise<PostCommentResponse[]> => {
      const response = await fetch(`/community/comments/${commentId}/replies`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch replies" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch replies"
        );
      }

      return response.json();
    },

    // Create a comment
    createComment: async (data: CreateCommentDto): Promise<PostCommentResponse> => {
      const response = await fetch("/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create comment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to create comment"
        );
      }

      return response.json();
    },

    // Update a comment
    updateComment: async (id: string, data: UpdateCommentDto): Promise<PostCommentResponse> => {
      const response = await fetch(`/community/comments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update comment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to update comment"
        );
      }

      return response.json();
    },

    // Delete a comment
    deleteComment: async (id: string): Promise<void> => {
      const response = await fetch(`/community/comments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete comment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to delete comment"
        );
      }
    },

    // ==================== Reactions ====================

    // Get reactions for a post
    getReactions: async (postId: string): Promise<ReactionSummary[]> => {
      const response = await fetch(`/community/posts/${postId}/reactions`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch reactions" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch reactions"
        );
      }

      return response.json();
    },

    // Create or update a reaction
    createOrUpdateReaction: async (data: CreateReactionDto): Promise<PostReactionResponse> => {
      const response = await fetch("/community/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to add reaction" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to add reaction"
        );
      }

      return response.json();
    },

    // Remove a reaction
    deleteReaction: async (postId: string): Promise<void> => {
      const response = await fetch(`/community/posts/${postId}/reactions`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to remove reaction" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to remove reaction"
        );
      }
    },

    // ==================== Bookmarks ====================

    // Get bookmarked posts
    getBookmarks: async (): Promise<BookmarkedPostResponse[]> => {
      const response = await fetch("/community/bookmarks", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch bookmarks" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch bookmarks"
        );
      }

      return response.json();
    },

    // Create a bookmark
    createBookmark: async (data: CreateBookmarkDto): Promise<PostBookmarkResponse> => {
      const response = await fetch("/community/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create bookmark" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to create bookmark"
        );
      }

      return response.json();
    },

    // Toggle bookmark
    toggleBookmark: async (postId: string): Promise<BookmarkToggleResponse> => {
      const response = await fetch(`/community/bookmarks/${postId}/toggle`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to toggle bookmark" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to toggle bookmark"
        );
      }

      return response.json();
    },

    // Delete bookmark
    deleteBookmark: async (postId: string): Promise<void> => {
      const response = await fetch(`/community/bookmarks/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to remove bookmark" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to remove bookmark"
        );
      }
    },

    // ==================== Admin ====================

    // [Admin] Get all posts including deleted
    getAdminPosts: async (
      query?: PostFeedQuery & { visibility?: PostVisibility }
    ): Promise<PostFeedResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.pageSize) params.append("pageSize", String(query.pageSize));
      if (query?.status !== undefined) params.append("status", String(query.status));
      if (query?.authorId) params.append("authorId", query.authorId);
      if (query?.searchTerm) params.append("searchTerm", query.searchTerm);
      if (query?.visibility !== undefined) params.append("visibility", String(query.visibility));

      const url = `/community/admin/posts${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch posts" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch posts"
        );
      }

      return response.json();
    },

    // [Admin] Hard delete a post
    hardDeletePost: async (id: string): Promise<void> => {
      const response = await fetch(`/community/posts/${id}/permanent`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to permanently delete post" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to permanently delete post"
        );
      }
    },

    // [Admin] Restore a deleted post
    restorePost: async (id: string): Promise<void> => {
      const response = await fetch(`/community/posts/${id}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to restore post" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to restore post"
        );
      }
    },

    // [Admin] Delete any comment
    adminDeleteComment: async (id: string): Promise<void> => {
      const response = await fetch(`/community/admin/comments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete comment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to delete comment"
        );
      }
    },
  };
}

