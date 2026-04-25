"use client";

import { Link } from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  BookmarkIcon,
  EyeIcon,
  FlagIcon,
  HeartIcon,
  Loader2,
  MessageCircleIcon,
  MoreHorizontalIcon,
  Share2Icon,
  TrashIcon,
  UndoIcon,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "#/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Textarea } from "#/components/ui/textarea";
import {
  PostStatus,
  type PostSummaryResponse,
  ReactionType,
  ReactionTypeEmojis,
  type ReportReason,
  ReportReasonLabels,
} from "#/lib/server/community";
import { cn } from "#/lib/utils";

interface PostCardProps {
  post: PostSummaryResponse;
  onReact: (postId: string, reaction: ReactionType | null) => void;
  onBookmark: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onArchive?: (postId: string, newStatus: PostStatus) => void;
  onReport?: (postId: string, reason: ReportReason, description?: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
  isOwner: boolean;
}

export function PostCard({
  post,
  onReact,
  onBookmark,
  onComment,
  onShare,
  onDelete,
  onArchive,
  onReport,
  onTagClick,
  isOwner,
}: PostCardProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [nsfwRevealed, setNsfwRevealed] = useState(false);

  const truncateUsername = (name: string) => {
    if (name.includes("@")) {
      return name.split("@")[0];
    }
    return name;
  };

  const handleSubmitReport = async () => {
    if (reportReason === null || !onReport) return;
    setIsSubmittingReport(true);
    try {
      await onReport(post.id, reportReason, reportDescription || undefined);
      setReportDialogOpen(false);
      setReportReason(null);
      setReportDescription("");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Link params={{ userId: post.authorId }} to="/user/$userId">
          <Avatar className="h-10 w-10 cursor-pointer transition-opacity hover:opacity-80">
            <AvatarFallback>{post.authorName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link params={{ userId: post.authorId }} to="/user/$userId">
            <p className="cursor-pointer font-semibold hover:underline">{truncateUsername(post.authorName)}</p>
          </Link>
          <p className="text-muted-foreground text-xs">
            {new Date(post.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        {post.isNsfw && (
          <Badge className="text-xs" variant="destructive">
            NSFW
          </Badge>
        )}
        {isOwner && (onDelete || onArchive) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8" size="icon" variant="ghost">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onArchive && (
                <DropdownMenuItem
                  onClick={() =>
                    onArchive(
                      post.id,
                      post.postStatus === PostStatus.Published ? PostStatus.Archived : PostStatus.Published,
                    )
                  }
                >
                  {post.postStatus === PostStatus.Published ? (
                    <>
                      <ArchiveIcon className="mr-2 h-4 w-4" />
                      Archive
                    </>
                  ) : (
                    <>
                      <UndoIcon className="mr-2 h-4 w-4" />
                      Publish
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(post.id)}>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!isOwner && onReport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8" size="icon" variant="ghost">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={() => setReportDialogOpen(true)}>
                <FlagIcon className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pb-2">
        {/* NSFW / Content Warning Overlay */}
        {post.photoUrl && (
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <img
              alt="Post"
              className={cn(
                "h-full w-full object-cover",
                (post.isNsfw || post.contentWarning) && !nsfwRevealed && "blur-xl",
              )}
              src={post.photoUrl}
            />
            {(post.isNsfw || post.contentWarning) && !nsfwRevealed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                <AlertTriangleIcon className="h-8 w-8 text-yellow-400" />
                <p className="font-medium text-sm text-white">{post.contentWarning || "Sensitive Content"}</p>
                <Button onClick={() => setNsfwRevealed(true)} size="sm" variant="secondary">
                  Show Content
                </Button>
              </div>
            )}
          </div>
        )}
        <p className="text-sm">{post.caption}</p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <Badge
                className="cursor-pointer text-xs hover:bg-primary/20"
                key={tag}
                onClick={() => onTagClick?.(tag)}
                variant="secondary"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-1">
          <div
            className="relative"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            <Button
              className={cn("gap-1", post.userReaction !== null && "text-red-500")}
              onClick={() => onReact(post.id, post.userReaction === ReactionType.Like ? null : ReactionType.Like)}
              size="sm"
              variant="ghost"
            >
              <HeartIcon className={cn("h-4 w-4", post.userReaction === ReactionType.Like && "fill-current")} />
              {post.reactionCount}
            </Button>
            {showReactions && (
              <div className="absolute bottom-full left-0 pb-2">
                <div className="flex gap-1 rounded-full border bg-popover p-1 shadow-lg">
                  {Object.entries(ReactionTypeEmojis).map(([type, emoji]) => (
                    <button
                      className={cn(
                        "rounded-full p-1.5 text-lg transition-transform hover:scale-125",
                        post.userReaction === Number(type) && "bg-muted",
                      )}
                      key={type}
                      onClick={() => {
                        onReact(post.id, post.userReaction === Number(type) ? null : (Number(type) as ReactionType));
                        setShowReactions(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button className="gap-1" onClick={() => onComment(post.id)} size="sm" variant="ghost">
            <MessageCircleIcon className="h-4 w-4" />
            {post.commentCount}
          </Button>
          {onShare && (
            <Button className="gap-1" onClick={() => onShare(post.id)} size="sm" variant="ghost">
              <Share2Icon className="h-4 w-4" />
              {post.shareCount > 0 && post.shareCount}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {post.viewCount > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <EyeIcon className="h-3.5 w-3.5" />
              {post.viewCount}
            </span>
          )}
          <Button
            className={cn(post.isBookmarked && "text-yellow-500")}
            onClick={() => onBookmark(post.id)}
            size="sm"
            variant="ghost"
          >
            <BookmarkIcon className={cn("h-4 w-4", post.isBookmarked && "fill-current")} />
          </Button>
        </div>
      </CardFooter>

      {/* Report Dialog */}
      <Dialog onOpenChange={setReportDialogOpen} open={reportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Please select a reason for reporting this post. Our team will review your report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for reporting</Label>
              <RadioGroup
                onValueChange={(value) => setReportReason(Number(value) as ReportReason)}
                value={reportReason?.toString() ?? ""}
              >
                {Object.entries(ReportReasonLabels).map(([value, label]) => (
                  <div className="flex items-center space-x-2" key={value}>
                    <RadioGroupItem id={`reason-${value}`} value={value} />
                    <Label className="cursor-pointer font-normal" htmlFor={`reason-${value}`}>
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Additional details (optional)</Label>
              <Textarea
                id="report-description"
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Provide any additional context about why you're reporting this post..."
                rows={3}
                value={reportDescription}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setReportDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={reportReason === null || isSubmittingReport}
              onClick={handleSubmitReport}
              variant="destructive"
            >
              {isSubmittingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
