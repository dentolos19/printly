"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import {
  BookmarkedPostResponse,
  CommunityStatsResponse,
  PostSummaryResponse,
  ReactionType,
} from "@/lib/server/community";
import { BookmarkIcon, PlusIcon } from "lucide-react";
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

  const [activeTab, setActiveTab] = useState("feed");
  const [posts, setPosts] = useState<PostSummaryResponse[]>([]);
  const [myPosts, setMyPosts] = useState<PostSummaryResponse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedPostResponse[]>([]);
  const [stats, setStats] = useState<CommunityStatsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
    }
  }, [activeTab, loadMyPosts, loadBookmarks]);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update bookmark");
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

  const handleComment = (postId: string) => {
    setSelectedPostId(postId);
    setPostDetailOpen(true);
  };

  const handlePostUpdated = () => {
    loadPosts();
    if (activeTab === "my-posts") loadMyPosts();
    if (activeTab === "bookmarks") loadBookmarks();
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
                <TabsTrigger value="my-posts">My Posts</TabsTrigger>
                <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
              </TabsList>

              {activeTab === "feed" && (
                <div className="w-full sm:w-64">
                  <SearchBar placeholder="Search posts..." onSearch={handleSearch} />
                </div>
              )}
            </div>

            <TabsContent value="feed" className="mt-6 space-y-6">
              <PostGrid
                posts={posts}
                loading={loading}
                currentUserId={claims?.id}
                onReact={handleReact}
                onBookmark={handleBookmark}
                onComment={handleComment}
                emptyTitle={searchTerm ? "No posts found" : "No posts yet"}
                emptyDescription={searchTerm ? "Try a different search term" : undefined}
                emptyActionLabel={searchTerm ? undefined : "Create your first post"}
                onEmptyAction={searchTerm ? undefined : () => setCreateDialogOpen(true)}
              />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </TabsContent>

            <TabsContent value="my-posts" className="mt-6">
              <PostGrid
                posts={myPosts}
                currentUserId={claims?.id}
                onReact={handleReact}
                onBookmark={handleBookmark}
                onComment={handleComment}
                onDelete={handleDelete}
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
      />
    </div>
  );
}
