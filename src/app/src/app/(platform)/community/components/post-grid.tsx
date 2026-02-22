"use client";

import { PostSummaryResponse, PostStatus, ReactionType, ReportReason } from "@/lib/server/community";
import { PostCard } from "./post-card";
import { PostCardSkeleton } from "./post-card-skeleton";
import { EmptyState } from "./empty-state";

interface PostGridProps {
  posts: PostSummaryResponse[];
  loading?: boolean;
  currentUserId?: string;
  onReact: (postId: string, reaction: ReactionType | null) => void;
  onBookmark: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onArchive?: (postId: string, newStatus: PostStatus) => void;
  onReport?: (postId: string, reason: ReportReason, description?: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function PostGrid({
  posts,
  loading = false,
  currentUserId,
  onReact,
  onBookmark,
  onComment,
  onShare,
  onDelete,
  onArchive,
  onReport,
  onTagClick,
  emptyTitle = "No posts yet",
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
}: PostGridProps) {
  if (loading && posts.length === 0) {
    return <PostCardSkeleton count={6} />;
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onReact={onReact}
          onBookmark={onBookmark}
          onComment={onComment}
          onShare={onShare}
          onDelete={onDelete}
          onArchive={onArchive}
          onReport={onReport}
          onTagClick={onTagClick}
          isOwner={currentUserId?.toLowerCase() === post.authorId?.toLowerCase()}
        />
      ))}
    </div>
  );
}
