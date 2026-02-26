"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import {
  PostCommentResponse,
  PostDetailResponse,
  PostStatus,
  ReactionType,
  ReactionTypeEmojis,
} from "@/lib/server/community";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CornerDownRightIcon,
  EyeIcon,
  Loader2,
  MessageCircleIcon,
  MoreHorizontalIcon,
  SendIcon,
  Share2Icon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface PostDetailDialogProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: () => void;
  onTagClick?: (tag: string) => void;
}

export function PostDetailDialog({ postId, open, onOpenChange, onPostUpdated, onTagClick }: PostDetailDialogProps) {
  const { api } = useServer();
  const { claims } = useAuth();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [comments, setComments] = useState<PostCommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nsfwRevealed, setNsfwRevealed] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyTargetName, setReplyTargetName] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, PostCommentResponse[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const replyInputRef = useRef<HTMLInputElement>(null);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await api.community.getPost(postId);
      setPost(data);
      setComments(data.comments);
      // Record a view
      api.community.recordPostView(postId).catch(() => {});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [api.community, postId]);

  useEffect(() => {
    if (open && postId) {
      setNsfwRevealed(false);
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
      // Check if it's a top-level comment — if so, remove its replies too
      const isTopLevel = comments.some((c) => c.id === commentId && !c.parentId);
      if (isTopLevel) {
        setExpandedReplies((prev) => {
          const updated = { ...prev };
          delete updated[commentId];
          return updated;
        });
      } else {
        // It's a reply — remove from expanded replies
        setExpandedReplies((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            updated[key] = updated[key].filter((r) => r.id !== commentId);
          }
          return updated;
        });
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onPostUpdated();
      toast.success("Comment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  const handleReplyClick = (commentId: string, authorName: string, threadParentId?: string) => {
    const targetThread = threadParentId || commentId;
    if (replyingTo === targetThread && replyTargetName === authorName) {
      setReplyingTo(null);
      setReplyParentId(null);
      setReplyTargetName("");
      setReplyContent("");
      return;
    }
    setReplyingTo(targetThread);
    setReplyParentId(commentId);
    setReplyTargetName(authorName);
    setReplyContent("");
    setTimeout(() => replyInputRef.current?.focus(), 50);
  };

  const handleSubmitReply = async (threadParentId: string) => {
    if (!postId || !replyContent.trim() || !replyParentId) return;
    setReplySubmitting(true);
    try {
      const reply = await api.community.createComment({
        postId,
        content: replyContent.trim(),
        parentId: replyParentId,
      });
      // Add to expanded replies under the thread parent
      setExpandedReplies((prev) => ({
        ...prev,
        [threadParentId]: [...(prev[threadParentId] || []), reply],
      }));
      // Update the top-level comment's reply count
      setComments((prev) => prev.map((c) => (c.id === threadParentId ? { ...c, replyCount: c.replyCount + 1 } : c)));
      setReplyContent("");
      setReplyingTo(null);
      setReplyParentId(null);
      setReplyTargetName("");
      onPostUpdated();
      toast.success("Reply added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add reply");
    } finally {
      setReplySubmitting(false);
    }
  };

  const toggleReplies = async (commentId: string) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies((prev) => {
        const updated = { ...prev };
        delete updated[commentId];
        return updated;
      });
      return;
    }
    setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));
    try {
      const replies = await api.community.getReplies(commentId);
      setExpandedReplies((prev) => ({ ...prev, [commentId]: replies }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load replies");
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
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

  const handleCommentReact = async (
    commentId: string,
    currentReaction: ReactionType | null,
    reaction: ReactionType,
  ) => {
    try {
      if (currentReaction === reaction) {
        await api.community.removeCommentReaction(commentId);
      } else {
        await api.community.reactToComment(commentId, reaction);
      }
      await loadPost();
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

  const handleShare = async () => {
    if (!postId) return;
    try {
      await api.community.sharePost(postId);
      toast.success("Post shared!");
      await loadPost();
      onPostUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share post");
    }
  };

  const handleToggleArchive = async () => {
    if (!postId || !post) return;
    try {
      const newStatus = post.postStatus === PostStatus.Archived ? PostStatus.Published : PostStatus.Archived;
      await api.community.updatePost(postId, { postStatus: newStatus });
      toast.success(newStatus === PostStatus.Archived ? "Post archived" : "Post published");
      onOpenChange(false);
      onPostUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update post");
    }
  };

  const handleDelete = async () => {
    if (!postId) return;
    try {
      await api.community.deletePost(postId);
      toast.success("Post deleted");
      onOpenChange(false);
      onPostUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    }
  };

  const truncateUsername = (name: string) => {
    if (name.includes("@")) {
      return name.split("@")[0];
    }
    return name;
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
                <Link href={`/user/${post.authorId}`}>
                  <Avatar className="h-10 w-10 cursor-pointer transition-opacity hover:opacity-80">
                    <AvatarFallback>{post.authorName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <Link href={`/user/${post.authorId}`}>
                    <DialogTitle className="cursor-pointer hover:underline">
                      {truncateUsername(post.authorName)}
                    </DialogTitle>
                  </Link>
                  <DialogDescription>
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </DialogDescription>
                </div>
                {post.isNsfw && (
                  <Badge variant="destructive" className="text-xs">
                    NSFW
                  </Badge>
                )}
                {claims?.id === post.authorId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleToggleArchive}>
                        <ArchiveIcon className="mr-2 h-4 w-4" />
                        {post.postStatus === PostStatus.Archived ? "Publish" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Photo with NSFW overlay */}
              {post.photoUrl && (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                  <img
                    src={post.photoUrl}
                    alt="Post"
                    className={cn(
                      "h-full w-full object-cover",
                      (post.isNsfw || post.contentWarning) && !nsfwRevealed && "blur-xl",
                    )}
                  />
                  {(post.isNsfw || post.contentWarning) && !nsfwRevealed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                      <AlertTriangleIcon className="h-8 w-8 text-yellow-400" />
                      <p className="text-sm font-medium text-white">{post.contentWarning || "Sensitive Content"}</p>
                      <Button size="sm" variant="secondary" onClick={() => setNsfwRevealed(true)}>
                        Show Content
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <p>{post.caption}</p>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="hover:bg-primary/20 cursor-pointer text-xs"
                      onClick={() => onTagClick?.(tag)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Reactions + actions */}
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
                <Button variant="ghost" size="sm" className="gap-1" onClick={handleShare}>
                  <Share2Icon className="h-4 w-4" />
                  {post.shareCount > 0 && post.shareCount}
                </Button>
                {post.viewCount > 0 && (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <EyeIcon className="h-3.5 w-3.5" />
                    {post.viewCount}
                  </span>
                )}
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

                {/* Comments list — only top-level */}
                <div className="space-y-3">
                  {comments
                    .filter((c) => !c.parentId)
                    .map((comment) => (
                      <div key={comment.id} className="space-y-1">
                        <div className="bg-muted space-y-2 rounded-lg p-3">
                          <div className="flex gap-3">
                            <Link href={`/user/${comment.authorId}`}>
                              <Avatar className="h-8 w-8 cursor-pointer transition-opacity hover:opacity-80">
                                <AvatarFallback>{comment.authorName.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link href={`/user/${comment.authorId}`}>
                                  <span className="cursor-pointer text-sm font-semibold hover:underline">
                                    {comment.authorName}
                                  </span>
                                </Link>
                                {comment.authorId === post.authorId && (
                                  <Badge
                                    variant="outline"
                                    className="border-primary/40 text-primary px-1.5 py-0 text-[10px] font-medium"
                                  >
                                    Owner
                                  </Badge>
                                )}
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
                          {/* Comment reaction bar + reply button */}
                          <div className="flex items-center gap-1 pl-11">
                            {Object.entries(ReactionTypeEmojis).map(([type, emoji]) => (
                              <button
                                key={type}
                                className={cn(
                                  "rounded-full px-1.5 py-0.5 text-sm transition-transform hover:scale-110",
                                  comment.userReaction === Number(type) && "bg-primary/20 ring-primary/50 ring-1",
                                )}
                                onClick={() =>
                                  handleCommentReact(comment.id, comment.userReaction, Number(type) as ReactionType)
                                }
                              >
                                {emoji}
                              </button>
                            ))}
                            {comment.reactionCount > 0 && (
                              <span className="text-muted-foreground ml-1 text-xs">{comment.reactionCount}</span>
                            )}
                            <span className="text-muted-foreground mx-1">·</span>
                            <button
                              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
                              onClick={() => handleReplyClick(comment.id, comment.authorName)}
                            >
                              <MessageCircleIcon className="h-3.5 w-3.5" />
                              Reply
                            </button>
                          </div>
                        </div>

                        {/* View replies toggle */}
                        {comment.replyCount > 0 && (
                          <button
                            className="text-muted-foreground hover:text-foreground ml-11 flex items-center gap-1 text-xs font-medium transition-colors"
                            onClick={() => toggleReplies(comment.id)}
                            disabled={loadingReplies[comment.id]}
                          >
                            {loadingReplies[comment.id] ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : expandedReplies[comment.id] ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            )}
                            {expandedReplies[comment.id]
                              ? "Hide replies"
                              : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
                          </button>
                        )}

                        {/* Expanded replies */}
                        {expandedReplies[comment.id] && (
                          <div className="ml-8 space-y-2 border-l-2 pl-3">
                            {expandedReplies[comment.id].map((reply) => (
                              <div key={reply.id} className="bg-muted/60 space-y-1.5 rounded-lg p-2.5">
                                <div className="flex gap-2.5">
                                  <Link href={`/user/${reply.authorId}`}>
                                    <Avatar className="h-6 w-6 cursor-pointer transition-opacity hover:opacity-80">
                                      <AvatarFallback className="text-xs">
                                        {reply.authorName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Link href={`/user/${reply.authorId}`}>
                                        <span className="cursor-pointer text-xs font-semibold hover:underline">
                                          {reply.authorName}
                                        </span>
                                      </Link>
                                      {reply.authorId === post.authorId && (
                                        <Badge
                                          variant="outline"
                                          className="border-primary/40 text-primary px-1.5 py-0 text-[10px] font-medium"
                                        >
                                          Owner
                                        </Badge>
                                      )}
                                      <span className="text-muted-foreground text-xs">
                                        {new Date(reply.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-sm">{reply.content}</p>
                                  </div>
                                  {claims?.id === reply.authorId && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleDeleteComment(reply.id)}
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                {/* Reply reaction bar + reply button */}
                                <div className="flex items-center gap-1 pl-8">
                                  {Object.entries(ReactionTypeEmojis).map(([type, emoji]) => (
                                    <button
                                      key={type}
                                      className={cn(
                                        "rounded-full px-1 py-0.5 text-xs transition-transform hover:scale-110",
                                        reply.userReaction === Number(type) && "bg-primary/20 ring-primary/50 ring-1",
                                      )}
                                      onClick={() =>
                                        handleCommentReact(reply.id, reply.userReaction, Number(type) as ReactionType)
                                      }
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                  {reply.reactionCount > 0 && (
                                    <span className="text-muted-foreground ml-1 text-xs">{reply.reactionCount}</span>
                                  )}
                                  <span className="text-muted-foreground mx-0.5">·</span>
                                  <button
                                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
                                    onClick={() => handleReplyClick(reply.id, reply.authorName, comment.id)}
                                  >
                                    <MessageCircleIcon className="h-3 w-3" />
                                    Reply
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyingTo === comment.id && (
                          <div className="ml-8 flex items-center gap-2 pt-1">
                            <CornerDownRightIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                            <Input
                              ref={replyInputRef}
                              placeholder={`Reply to ${replyTargetName}...`}
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmitReply(comment.id)}
                              className="h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={replySubmitting || !replyContent.trim()}
                            >
                              {replySubmitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <SendIcon className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyParentId(null);
                                setReplyTargetName("");
                                setReplyContent("");
                              }}
                            >
                              ✕
                            </Button>
                          </div>
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
