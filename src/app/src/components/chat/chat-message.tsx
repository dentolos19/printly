"use client";

import { Check, CheckCheck, CornerUpLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { forwardRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatMessageTime } from "@/lib/utils";
import { FileAttachment } from "./file-attachment";
import { VoiceMessagePlayer } from "./voice-message-player";

export interface ChatMessageProps {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  isCurrentUser: boolean;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  editedAt?: string | null;
  replyToContent?: string | null;
  replyToSenderName?: string | null;
  // File attachment props
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  // Voice message props
  voiceMessageUrl?: string | null;
  voiceMessageDuration?: number | null;
  onReply?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  (
    {
      id,
      content,
      senderName,
      senderId,
      isCurrentUser,
      isRead,
      isEdited,
      isDeleted,
      createdAt,
      editedAt,
      replyToContent,
      replyToSenderName,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      voiceMessageUrl,
      voiceMessageDuration,
      onReply,
      onEdit,
      onDelete,
    },
    ref,
  ) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const hasFile = fileUrl && fileName && fileType && fileSize;
    const hasVoice = voiceMessageUrl && voiceMessageDuration;

    const handleEdit = () => {
      if (editContent.trim() && editContent !== content) {
        onEdit?.(editContent);
      }
      setIsEditing(false);
    };

    const handleCancelEdit = () => {
      setEditContent(content);
      setIsEditing(false);
    };

    const handleDelete = () => {
      onDelete?.();
      setShowDeleteDialog(false);
    };

    return (
      <>
        <div className={cn("group flex gap-3 px-4 py-2", isCurrentUser ? "flex-row-reverse" : "flex-row")} ref={ref}>
          {!isCurrentUser && (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-muted text-xs">{getInitials(senderName)}</AvatarFallback>
            </Avatar>
          )}

          <div className={cn("flex max-w-[70%] flex-col gap-1", isCurrentUser ? "items-end" : "items-start")}>
            {replyToContent && (
              <div
                className={cn(
                  "bg-muted/50 mb-1 flex items-start gap-2 rounded-lg border-l-2 px-3 py-1.5 text-sm",
                  isCurrentUser ? "border-l-primary" : "border-l-muted-foreground",
                )}
              >
                <CornerUpLeft className="text-muted-foreground h-3 w-3 shrink-0" />
                <div className="min-w-0">
                  <span className="text-muted-foreground font-medium">{replyToSenderName}: </span>
                  <span className="text-muted-foreground">{replyToContent.slice(0, 100)}...</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    className="min-h-[60px] min-w-[200px]"
                    onChange={(e) => setEditContent(e.target.value)}
                    value={editContent}
                  />
                  <div className="flex justify-end gap-2">
                    <Button onClick={handleCancelEdit} size="sm" variant="ghost">
                      Cancel
                    </Button>
                    <Button onClick={handleEdit} size="sm">
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {hasVoice && !isDeleted && (
                      <VoiceMessagePlayer
                        className={cn(isCurrentUser ? "bg-primary/10" : "bg-muted")}
                        duration={voiceMessageDuration}
                        url={voiceMessageUrl}
                      />
                    )}

                    {hasFile && !isDeleted && (
                      <FileAttachment fileName={fileName} fileSize={fileSize} fileType={fileType} url={fileUrl} />
                    )}

                    {(!hasVoice || !content.startsWith("🎤")) && (!hasFile || !content.startsWith("📎")) && (
                      <div
                        className={cn(
                          "prose prose-sm dark:prose-invert max-w-none rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                          isDeleted
                            ? "bg-muted text-muted-foreground italic"
                            : isCurrentUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                        )}
                      >
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-1 wrap-break-word whitespace-pre-wrap last:mb-0">{children}</p>
                            ),
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
                            ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            a: ({ href, children }) => (
                              <a
                                className={cn(
                                  "underline hover:no-underline",
                                  isCurrentUser ? "text-primary-foreground/80" : "text-primary",
                                )}
                                href={href}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {children}
                              </a>
                            ),
                            code: ({ children, className }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code
                                  className={cn(
                                    "rounded px-1 py-0.5 font-mono text-xs",
                                    isCurrentUser ? "bg-primary-foreground/20" : "bg-muted-foreground/10",
                                  )}
                                >
                                  {children}
                                </code>
                              ) : (
                                <code
                                  className={cn(
                                    "block overflow-x-auto rounded p-2 font-mono text-xs",
                                    isCurrentUser ? "bg-primary-foreground/20" : "bg-muted-foreground/10",
                                  )}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                          remarkPlugins={[remarkGfm]}
                        >
                          {content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {!isDeleted && (onEdit || onDelete || onReply) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                        {onReply && (
                          <DropdownMenuItem onClick={onReply}>
                            <CornerUpLeft className="mr-2 h-4 w-4" />
                            Reply
                          </DropdownMenuItem>
                        )}
                        {onEdit && isCurrentUser && (
                          <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && isCurrentUser && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">{formatMessageTime(createdAt)}</span>
              {isEdited && !isDeleted && <span className="text-muted-foreground/60 text-xs">• edited</span>}
              {isCurrentUser && !isDeleted && (
                <span className="text-muted-foreground">
                  {isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                </span>
              )}
            </div>
          </div>
        </div>

        <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this message? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  },
);

ChatMessage.displayName = "ChatMessage";

export interface ChatDateSeparatorProps {
  date: string;
}

export function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  return (
    <div className="flex items-center justify-center py-4">
      <Badge className="text-xs font-normal" variant="secondary">
        {formatDate(date)}
      </Badge>
    </div>
  );
}
