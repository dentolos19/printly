"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import {
  BookmarkedPostResponse,
  CommunityStatsResponse,
  PostSummaryResponse,
  PostStatus,
  ReactionType,
  ReportReason,
  ReportType,
} from "@/lib/server/community";
import { BookmarkIcon, PlusIcon, TrendingUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CreatePostDialog,
  EmptyState,
  Pagination,
  PostCard,
  PostDetailDialog,
  PostGrid,
  SearchBar,
  StatsCard,
} from "./components";

// ==================== Main Page Component ====================
export default function CommunityPage() {
  const { api } = useServer();
  const { claims } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("feed");
  const [posts, setPosts] = useState<PostSummaryResponse[]>([]);
  const [myPosts, setMyPosts] = useState<PostSummaryResponse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedPostResponse[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<PostSummaryResponse[]>([]);
  const [explorePosts, setExplorePosts] = useState<PostSummaryResponse[]>([]);
  const [stats, setStats] = useState<CommunityStatsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [trendingPage, setTrendingPage] = useState(1);
  const [trendingTotalPages, setTrendingTotalPages] = useState(1);
  const [explorePage, setExplorePage] = useState(1);
  const [exploreTotalPages, setExploreTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetailOpen, setPostDetailOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.community.getPosts({ page, pageSize: 12, searchTerm: searchTerm || undefined });
      setPosts(data.posts);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [api.community, page, searchTerm]);

  const loadMyPosts = useCallback(async () => {
    try {
      const data = await api.community.getMyPosts();
      setMyPosts(data);
    } catch (error) {
      console.error("Failed to load my posts:", error);
    }
  }, [api.community]);

  const loadBookmarks = useCallback(async () => {
    try {
      const data = await api.community.getBookmarks();
      setBookmarks(data);
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
    }
  }, [api.community]);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.community.getTrendingPosts(trendingPage, 12);
      setTrendingPosts(data.posts);
      setTrendingTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to load trending:", error);
    } finally {
      setLoading(false);
    }
  }, [api.community, trendingPage]);

  const loadExplore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.community.getExploreFeed(explorePage, 12);
      setExplorePosts(data.posts);
      setExploreTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to load explore:", error);
    } finally {
      setLoading(false);
    }
  }, [api.community, explorePage]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.community.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [api.community]);

  useEffect(() => {
    loadPosts();
    loadStats();
  }, [loadPosts, loadStats]);

  useEffect(() => {
    if (activeTab === "my-posts") {
      loadMyPosts();
    } else if (activeTab === "bookmarks") {
      loadBookmarks();
    } else if (activeTab === "trending") {
      loadTrending();
    } else if (activeTab === "explore") {
      loadExplore();
    }
  }, [activeTab, loadMyPosts, loadBookmarks, loadTrending, loadExplore]);

  const handleReact = async (postId: string, reaction: ReactionType | null) => {
    try {
      if (reaction === null) {
        await api.community.deleteReaction(postId);
      } else {
        await api.community.createOrUpdateReaction({ postId, reactionType: reaction });
      }
      loadPosts();
      if (activeTab === "my-posts") loadMyPosts();
      if (activeTab === "bookmarks") loadBookmarks();
      if (activeTab === "trending") loadTrending();
      if (activeTab === "explore") loadExplore();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      await api.community.toggleBookmark(postId);
      loadPosts();
      if (activeTab === "my-posts") loadMyPosts();
      if (activeTab === "bookmarks") loadBookmarks();
      if (activeTab === "trending") loadTrending();
      if (activeTab === "explore") loadExplore();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update bookmark");
    }
  };

  const handleShare = async (postId: string) => {
    try {
      await api.community.sharePost(postId);
      toast.success("Post shared!");
      loadPosts();
      if (activeTab === "trending") loadTrending();
      if (activeTab === "explore") loadExplore();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share post");
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await api.community.deletePost(postId);
      toast.success("Post deleted");
      loadPosts();
      loadMyPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    }
  };

  const handleArchive = async (postId: string, newStatus: PostStatus) => {
    try {
      await api.community.updatePost(postId, { postStatus: newStatus });
      toast.success(newStatus === PostStatus.Archived ? "Post archived" : "Post published");
      loadPosts();
      loadMyPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update post");
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
      toast.success("Report submitted. Thank you for helping keep our community safe.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit report");
    }
  };

  const handleComment = (postId: string) => {
    setSelectedPostId(postId);
    setPostDetailOpen(true);
  };

  const handleTagClick = (tag: string) => {
    router.push(`/community/tags/${encodeURIComponent(tag)}`);
  };

  const handlePostUpdated = () => {
    loadPosts();
    if (activeTab === "my-posts") loadMyPosts();
    if (activeTab === "bookmarks") loadBookmarks();
    if (activeTab === "trending") loadTrending();
    if (activeTab === "explore") loadExplore();
  };

  const handleSearch = useCallback((query: string) => {
    setSearchTerm(query);
    setPage(1); // Reset to first page when searching
  }, []);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">Share and discover amazing designs</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main content */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="trending">
                  <TrendingUpIcon className="mr-1.5 h-3.5 w-3.5" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="explore">Explore</TabsTrigger>
                <TabsTrigger value="my-posts">My Posts</TabsTrigger>
                <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
              </TabsList>

              <div className="w-full sm:w-64">
                {activeTab === "feed" && <SearchBar placeholder="Search posts..." onSearch={handleSearch} />}
              </div>
            </div>

            <TabsContent value="feed" className="mt-6 space-y-6">
              <PostGrid
                posts={posts}
                loading={loading}
                currentUserId={claims?.id}
                onReact={handleReact}
                onBookmark={handleBookmark}
                onComment={handleComment}
                onShare={handleShare}
                onArchive={handleArchive}
                onReport={handleReport}
                onTagClick={handleTagClick}
                emptyTitle={searchTerm ? "No posts found" : "No posts yet"}
                emptyDescription={searchTerm ? "Try a different search term" : undefined}
                emptyActionLabel={searchTerm ? undefined : "Create your first post"}
                onEmptyAction={searchTerm ? undefined : () => setCreateDialogOpen(true)}
              />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </TabsContent>

            <TabsContent value="trending" className="mt-6 space-y-6">
              <PostGrid
                posts={trendingPosts}
                loading={loading}
                currentUserId={claims?.id}
                onReact={handleReact}
                onBookmark={handleBookmark}
                onComment={handleComment}
                onShare={handleShare}
                onReport={handleReport}
                onTagClick={handleTagClick}
                emptyTitle="No trending posts"
                emptyDescription="Check back later for trending content"
              />
              <Pagination page={trendingPage} totalPages={trendingTotalPages} onPageChange={setTrendingPage} />
            </TabsContent>

            <TabsContent value="explore" className="mt-6 space-y-6">
              <PostGrid
                posts={explorePosts}
                loading={loading}
                currentUserId={claims?.id}
                onReact={handleReact}
                onBookmark={handleBookmark}
                onComment={handleComment}
                onShare={handleShare}
                onReport={handleReport}
                onTagClick={handleTagClick}
                emptyTitle="Nothing to explore"
                emptyDescription="Follow more people to see content here"
              />
              <Pagination page={explorePage} totalPages={exploreTotalPages} onPageChange={setExplorePage} />
            </TabsContent>

            <TabsContent value="my-posts" className="mt-6">
              <PostGrid
                posts={myPosts}
                currentUserId={claims?.id}
                onReact={handleReact}
                onBookmark={handleBookmark}
                onComment={handleComment}
                onShare={handleShare}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onReport={handleReport}
                onTagClick={handleTagClick}
                emptyTitle="No posts yet"
                emptyActionLabel="Create your first post"
                onEmptyAction={() => setCreateDialogOpen(true)}
              />
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-6">
              {bookmarks.length === 0 ? (
                <EmptyState
                  icon={BookmarkIcon}
                  title="No bookmarks yet"
                  description="Save posts you like to view them later"
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {bookmarks.map((bookmark) => (
                    <PostCard
                      key={bookmark.id}
                      post={bookmark.post}
                      onReact={handleReact}
                      onBookmark={handleBookmark}
                      onComment={handleComment}
                      onShare={handleShare}
                      onArchive={handleArchive}
                      onReport={handleReport}
                      onTagClick={handleTagClick}
                      isOwner={claims?.id === bookmark.post.authorId}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <StatsCard stats={stats} loading={statsLoading} />
        </div>
      </div>

      {/* Dialogs */}
      <CreatePostDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onPostCreated={() => {
          loadPosts();
          loadMyPosts();
          loadStats();
        }}
      />

      <PostDetailDialog
        postId={selectedPostId}
        open={postDetailOpen}
        onOpenChange={setPostDetailOpen}
        onPostUpdated={handlePostUpdated}
        onTagClick={handleTagClick}
      />
    </div>
  );
}
