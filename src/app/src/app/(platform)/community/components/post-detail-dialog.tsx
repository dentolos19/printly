"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import { PostCommentResponse, PostDetailResponse, ReactionType, ReactionTypeEmojis } from "@/lib/server/community";
import { cn } from "@/lib/utils";
import { BookmarkIcon, Loader2, SendIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PostDetailDialogProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: () => void;
}

export function PostDetailDialog({ postId, open, onOpenChange, onPostUpdated }: PostDetailDialogProps) {
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
        {/* Hidden title for accessibility when loading or no post */}
        {(!post || loading) && (
          <VisuallyHidden>
            <DialogTitle>{loading ? "Loading post..." : "Post not found"}</DialogTitle>
          </VisuallyHidden>
        )}

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
                      post.userReaction === Number(type) && "bg-muted ring-primary ring-2",
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
            {post.reactionSummaries && post.reactionSummaries.length > 0 && (
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
