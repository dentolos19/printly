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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  PostSummaryResponse,
  PostStatus,
  ReactionType,
  ReactionTypeEmojis,
  ReportReason,
  ReportReasonLabels,
} from "@/lib/server/community";
import { cn } from "@/lib/utils";
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
import Link from "next/link";
import { useState } from "react";

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
        <Link href={`/user/${post.authorId}`}>
          <Avatar className="h-10 w-10 cursor-pointer transition-opacity hover:opacity-80">
            <AvatarFallback>{post.authorName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/user/${post.authorId}`}>
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
          <Badge variant="destructive" className="text-xs">
            NSFW
          </Badge>
        )}
        {isOwner && (onDelete || onArchive) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
                <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReportDialogOpen(true)} className="text-destructive">
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
        <p className="text-sm">{post.caption}</p>

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
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-1">
          <div
            className="relative"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-1", post.userReaction !== null && "text-red-500")}
              onClick={() => onReact(post.id, post.userReaction === ReactionType.Like ? null : ReactionType.Like)}
            >
              <HeartIcon className={cn("h-4 w-4", post.userReaction === ReactionType.Like && "fill-current")} />
              {post.reactionCount}
            </Button>
            {showReactions && (
              <div className="absolute bottom-full left-0 pb-2">
                <div className="bg-popover flex gap-1 rounded-full border p-1 shadow-lg">
                  {Object.entries(ReactionTypeEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      className={cn(
                        "rounded-full p-1.5 text-lg transition-transform hover:scale-125",
                        post.userReaction === Number(type) && "bg-muted",
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
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => onComment(post.id)}>
            <MessageCircleIcon className="h-4 w-4" />
            {post.commentCount}
          </Button>
          {onShare && (
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => onShare(post.id)}>
              <Share2Icon className="h-4 w-4" />
              {post.shareCount > 0 && post.shareCount}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {post.viewCount > 0 && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <EyeIcon className="h-3.5 w-3.5" />
              {post.viewCount}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBookmark(post.id)}
            className={cn(post.isBookmarked && "text-yellow-500")}
          >
            <BookmarkIcon className={cn("h-4 w-4", post.isBookmarked && "fill-current")} />
          </Button>
        </div>
      </CardFooter>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
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
                value={reportReason?.toString() ?? ""}
                onValueChange={(value) => setReportReason(Number(value) as ReportReason)}
              >
                {Object.entries(ReportReasonLabels).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`reason-${value}`} />
                    <Label htmlFor={`reason-${value}`} className="cursor-pointer font-normal">
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
                placeholder="Provide any additional context about why you're reporting this post..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={reportReason === null || isSubmittingReport}
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
