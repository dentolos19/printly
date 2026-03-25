"use client";

import { PostStatus, PostSummaryResponse, ReactionType, ReportReason } from "@/lib/server/community";
import { EmptyState } from "./empty-state";
import { PostCard } from "./post-card";
import { PostCardSkeleton } from "./post-card-skeleton";

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
        actionLabel={emptyActionLabel}
        description={emptyDescription}
        onAction={onEmptyAction}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard
          isOwner={currentUserId?.toLowerCase() === post.authorId?.toLowerCase()}
          key={post.id}
          onArchive={onArchive}
          onBookmark={onBookmark}
          onComment={onComment}
          onDelete={onDelete}
          onReact={onReact}
          onReport={onReport}
          onShare={onShare}
          onTagClick={onTagClick}
          post={post}
        />
      ))}
    </div>
  );
}
