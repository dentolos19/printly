"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostSummaryResponse, ReactionType, ReactionTypeEmojis } from "@/lib/server/community";
import { cn } from "@/lib/utils";
import { BookmarkIcon, HeartIcon, MessageCircleIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

interface PostCardProps {
  post: PostSummaryResponse;
  onReact: (postId: string, reaction: ReactionType | null) => void;
  onBookmark: (postId: string) => void;
  onComment: (postId: string) => void;
  onDelete?: (postId: string) => void;
  isOwner: boolean;
}

export function PostCard({ post, onReact, onBookmark, onComment, onDelete, isOwner }: PostCardProps) {
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

