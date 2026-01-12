"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import {
  BookmarkedPostResponse,
  CommunityStatsResponse,
  PostCommentResponse,
  PostDetailResponse,
  PostStatus,
  PostSummaryResponse,
  ReactionType,
  ReactionTypeEmojis,
} from "@/lib/server/community";
import { cn } from "@/lib/utils";
import {
  BookmarkIcon,
  HeartIcon,
  Loader2,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SendIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ==================== Post Card Component ====================
function PostCard({
  post,
  onReact,
  onBookmark,
  onComment,
  onDelete,
  isOwner,
}: {
  post: PostSummaryResponse;
  onReact: (postId: string, reaction: ReactionType | null) => void;
  onBookmark: (postId: string) => void;
  onComment: (postId: string) => void;
  onDelete?: (postId: string) => void;
  isOwner: boolean;
}) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{post.authorName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{post.authorName}</p>
          <p className="text-muted-foreground text-xs">
            {new Date(post.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        {isOwner && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pb-2">
        {post.photoUrl && (
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <img src={post.photoUrl} alt="Post" className="h-full w-full object-cover" />
          </div>
        )}
        <p className="text-sm">{post.caption}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-1">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-1", post.userReaction !== null && "text-red-500")}
              onClick={() => setShowReactions(!showReactions)}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              <HeartIcon className={cn("h-4 w-4", post.userReaction !== null && "fill-current")} />
              {post.reactionCount}
            </Button>
            {showReactions && (
              <div
                className="bg-popover absolute bottom-full left-0 mb-2 flex gap-1 rounded-full border p-1 shadow-lg"
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
              >
                {Object.entries(ReactionTypeEmojis).map(([type, emoji]) => (
                  <button
                    key={type}
                    className={cn(
                      "rounded-full p-1.5 text-lg transition-transform hover:scale-125",
                      post.userReaction === Number(type) && "bg-muted"
                    )}
                    onClick={() => {
                      onReact(post.id, post.userReaction === Number(type) ? null : (Number(type) as ReactionType));
                      setShowReactions(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => onComment(post.id)}>
            <MessageCircleIcon className="h-4 w-4" />
            {post.commentCount}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBookmark(post.id)}
          className={cn(post.isBookmarked && "text-yellow-500")}
        >
          <BookmarkIcon className={cn("h-4 w-4", post.isBookmarked && "fill-current")} />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ==================== Post Detail Dialog ====================
function PostDetailDialog({
  postId,
  open,
  onOpenChange,
  onPostUpdated,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: () => void;
}) {
  const { api } = useServer();
  const { claims } = useAuth();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [comments, setComments] = useState<PostCommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await api.community.getPost(postId);
      setPost(data);
      setComments(data.comments);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [api.community, postId]);

  useEffect(() => {
    if (open && postId) {
      loadPost();
    }
  }, [open, postId, loadPost]);

  const handleAddComment = async () => {
    if (!postId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const comment = await api.community.createComment({
        postId,
        content: newComment.trim(),
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      onPostUpdated();
      toast.success("Comment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.community.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onPostUpdated();
      toast.success("Comment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  const handleReact = async (reaction: ReactionType | null) => {
    if (!postId || !post) return;
    try {
      if (reaction === null) {
        await api.community.deleteReaction(postId);
      } else {
        await api.community.createOrUpdateReaction({ postId, reactionType: reaction });
      }
      await loadPost();
      onPostUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    }
  };

  const handleBookmark = async () => {
    if (!postId || !post) return;
    try {
      await api.community.toggleBookmark(postId);
      setPost((prev) => (prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null));
      onPostUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update bookmark");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : post ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{post.authorName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle>{post.authorName}</DialogTitle>
                  <DialogDescription>
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {post.photoUrl && (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                  <img src={post.photoUrl} alt="Post" className="h-full w-full object-cover" />
                </div>
              )}

              <p>{post.caption}</p>

              {/* Reactions */}
              <div className="flex items-center gap-2 border-y py-3">
                <div className="flex gap-1">
                  {Object.entries(ReactionTypeEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      className={cn(
                        "rounded-full p-2 text-xl transition-transform hover:scale-110",
                        post.userReaction === Number(type) && "bg-muted ring-2 ring-primary"
                      )}
                      onClick={() =>
                        handleReact(post.userReaction === Number(type) ? null : (Number(type) as ReactionType))
                      }
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  className={cn(post.isBookmarked && "text-yellow-500")}
                >
                  <BookmarkIcon className={cn("h-5 w-5", post.isBookmarked && "fill-current")} />
                </Button>
              </div>

              {/* Reaction summary */}
              {post.reactionSummaries.length > 0 && (
                <div className="flex gap-2">
                  {post.reactionSummaries.map((summary) => (
                    <Badge key={summary.reactionType} variant="secondary">
                      {ReactionTypeEmojis[summary.reactionType]} {summary.count}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Comments */}
              <div className="space-y-3">
                <h4 className="font-semibold">Comments ({comments.length})</h4>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                  />
                  <Button onClick={handleAddComment} disabled={submitting || !newComment.trim()}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Comments list */}
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-muted flex gap-3 rounded-lg p-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{comment.authorName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{comment.authorName}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      {claims?.id === comment.authorId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ==================== Create Post Dialog ====================
function CreatePostDialog({
  open,
  onOpenChange,
  onPostCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}) {
  const { api } = useServer();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file || !caption.trim()) {
      toast.error("Please add a photo and caption");
      return;
    }

    setSubmitting(true);
    try {
      // Upload the image first
      const asset = await api.asset.uploadAsset(file);

      // Create the post
      await api.community.createPost({
        caption: caption.trim(),
        photoId: asset.id,
        postStatus: PostStatus.Published,
      });

      toast.success("Post created successfully!");
      onOpenChange(false);
      onPostCreated();
      setCaption("");
      setFile(null);
      setPreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>Share something with the community</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="aspect-square w-full rounded-lg object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="border-muted-foreground/25 hover:border-muted-foreground/50 flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors">
                <PlusIcon className="text-muted-foreground h-10 w-10" />
                <span className="text-muted-foreground text-sm">Click to upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label>Caption</Label>
            <Textarea
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !file || !caption.trim()}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Stats Card ====================
function StatsCard({ stats, loading }: { stats: CommunityStatsResponse | null; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Community Stats</h3>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalPosts}</p>
          <p className="text-muted-foreground text-sm">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalComments}</p>
          <p className="text-muted-foreground text-sm">Comments</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalReactions}</p>
          <p className="text-muted-foreground text-sm">Reactions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
          <p className="text-muted-foreground text-sm">Contributors</p>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetailOpen, setPostDetailOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.community.getPosts({ page, pageSize: 12 });
      setPosts(data.posts);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [api.community, page]);

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

  const renderPosts = (postsToRender: PostSummaryResponse[], showDelete = false) => {
    if (loading && postsToRender.length === 0) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-square w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (postsToRender.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No posts yet</p>
          <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Create your first post
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {postsToRender.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onReact={handleReact}
            onBookmark={handleBookmark}
            onComment={handleComment}
            onDelete={showDelete ? handleDelete : undefined}
            isOwner={claims?.id === post.authorId}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <TabsList>
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="my-posts">My Posts</TabsTrigger>
              <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-6">
              {renderPosts(posts)}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-6">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {page} of {totalPages}
                  </span>
                  <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-posts" className="mt-6">
              {renderPosts(myPosts, true)}
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-6">
              {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <BookmarkIcon className="text-muted-foreground h-12 w-12" />
                  <p className="text-muted-foreground mt-4">No bookmarks yet</p>
                  <p className="text-muted-foreground text-sm">Save posts you like to view them later</p>
                </div>
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

