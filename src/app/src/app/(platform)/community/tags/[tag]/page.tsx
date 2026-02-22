"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import {
  PostSummaryResponse,
  PostStatus,
  ReactionType,
  ReportReason,
  ReportType,
} from "@/lib/server/community";
import { ArrowLeftIcon, HashIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pagination, PostDetailDialog, PostGrid } from "../../components";

export default function TagPage() {
  const { api } = useServer();
  const { claims } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);

  const [posts, setPosts] = useState<PostSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetailOpen, setPostDetailOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.community.getPostsByTag(tag, page, 12);
      setPosts(data.posts);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [api.community, tag, page]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleReact = async (postId: string, reaction: ReactionType | null) => {
    try {
      if (reaction === null) {
        await api.community.deleteReaction(postId);
      } else {
        await api.community.createOrUpdateReaction({ postId, reactionType: reaction });
      }
      loadPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      await api.community.toggleBookmark(postId);
      loadPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update bookmark");
    }
  };

  const handleShare = async (postId: string) => {
    try {
      await api.community.sharePost(postId);
      toast.success("Post shared!");
      loadPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share post");
    }
  };

  const handleReport = async (postId: string, reason: ReportReason, description?: string) => {
    try {
      await api.community.createReport({
        reportType: ReportType.Post,
        postId,
        reason,
        description,
      });
      toast.success("Report submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit report");
    }
  };

  const handleTagClick = (clickedTag: string) => {
    router.push(`/community/tags/${encodeURIComponent(clickedTag)}`);
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/community">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <HashIcon className="text-primary h-6 w-6" />
            <h1 className="text-3xl font-bold">{tag}</h1>
          </div>
          {!loading && (
            <p className="text-muted-foreground mt-1">
              {posts.length > 0 ? `Showing posts tagged with #${tag}` : `No posts tagged with #${tag}`}
            </p>
          )}
        </div>
      </div>

      {/* Posts grid */}
      <PostGrid
        posts={posts}
        loading={loading}
        currentUserId={claims?.id}
        onReact={handleReact}
        onBookmark={handleBookmark}
        onComment={(postId) => {
          setSelectedPostId(postId);
          setPostDetailOpen(true);
        }}
        onShare={handleShare}
        onReport={handleReport}
        onTagClick={handleTagClick}
        emptyTitle={`No posts tagged #${tag}`}
        emptyDescription="Be the first to create a post with this tag"
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <PostDetailDialog
        postId={selectedPostId}
        open={postDetailOpen}
        onOpenChange={setPostDetailOpen}
        onPostUpdated={loadPosts}
        onTagClick={handleTagClick}
      />
    </div>
  );
}
