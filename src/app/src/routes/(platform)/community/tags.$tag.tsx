"use client";

import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, HashIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { useAuth } from "#/lib/providers/auth";
import { useServer } from "#/lib/providers/server";
import { type PostSummaryResponse, type ReactionType, type ReportReason, ReportType } from "#/lib/server/community";
import { Pagination, PostDetailDialog, PostGrid } from "#/routes/(platform)/community/-components";

function TagPage() {
  const { api } = useServer();
  const { claims } = useAuth();
  const navigate = useNavigate();
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
    navigate({ to: "/community/tags/$tag", params: { tag: clickedTag } });
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/community">
          <Button size="icon" variant="ghost">
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <HashIcon className="h-6 w-6 text-primary" />
            <h1 className="font-bold text-3xl">{tag}</h1>
          </div>
          {!loading && (
            <p className="mt-1 text-muted-foreground">
              {posts.length > 0 ? `Showing posts tagged with #${tag}` : `No posts tagged with #${tag}`}
            </p>
          )}
        </div>
      </div>

      {/* Posts grid */}
      <PostGrid
        currentUserId={claims?.id}
        emptyDescription="Be the first to create a post with this tag"
        emptyTitle={`No posts tagged #${tag}`}
        loading={loading}
        onBookmark={handleBookmark}
        onComment={(postId) => {
          setSelectedPostId(postId);
          setPostDetailOpen(true);
        }}
        onReact={handleReact}
        onReport={handleReport}
        onShare={handleShare}
        onTagClick={handleTagClick}
        posts={posts}
      />
      <Pagination onPageChange={setPage} page={page} totalPages={totalPages} />

      <PostDetailDialog
        onOpenChange={setPostDetailOpen}
        onPostUpdated={loadPosts}
        onTagClick={handleTagClick}
        open={postDetailOpen}
        postId={selectedPostId}
      />
    </div>
  );
}

export const Route = createFileRoute("/(platform)/community/tags/$tag")({
  component: TagPage,
});
