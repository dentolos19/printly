import { Check, CheckCheck, MoreVertical, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TicketMessage } from "@/types/support";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: TicketMessage;
  isOwn: boolean;
  isAdmin: boolean;
  currentUserId: string;
  onReply?: (message: TicketMessage) => void;
  onEdit?: (message: TicketMessage) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  isAdmin,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if this message has been read
  const isRead = isAdmin ? message.isReadByCustomer : message.isReadByAdmin;

  // Can only edit/delete own messages that aren't deleted
  const canModify = isOwn && !message.isDeleted;

  return (
    <div
      className={cn(
        "flex gap-2 mb-4 group",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for received messages (left side) */}
      {!isOwn && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(message.senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message content */}
      <div className={cn("max-w-[70%] min-w-[100px]", isOwn && "flex flex-col items-end")}>
        {/* Sender name for received messages */}
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1 ml-1">
            {message.senderName}
          </span>
        )}

        <div className="relative">
          {/* Message bubble */}
          <div
            className={cn(
              "rounded-lg p-3 shadow-sm",
              isOwn
                ? "bg-[#dcf8c6] border border-[#b8e6a0]"
                : "bg-white border border-gray-200",
              message.isDeleted && "italic opacity-70"
            )}
          >
            {/* Reply preview if this is a reply */}
            {message.replyToMessageId && message.replyToContent && (
              <div className="border-l-4 border-primary pl-2 mb-2 text-sm opacity-70 bg-white/50 rounded p-1">
                <div className="text-xs font-medium text-primary">
                  {message.replyToSenderName}
                </div>
                <div className="line-clamp-2">{message.replyToContent}</div>
              </div>
            )}

            {/* Message content */}
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>

          {/* Actions menu (show on hover for own messages) */}
          {canModify && (
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded hover:bg-gray-100">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onReply && (
                    <DropdownMenuItem onClick={() => onReply(message)}>
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(message.id)}
                      className="text-red-600"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Quick reply button for received messages */}
          {!isOwn && onReply && (
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onReply(message)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <Reply className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Timestamp and status */}
        <div
          className={cn(
            "text-xs text-muted-foreground mt-1 flex items-center gap-1",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {message.isEdited && <span className="opacity-70">(edited)</span>}
          {isOwn && (
            <span>
              {isRead ? (
                <CheckCheck className="w-4 h-4 text-blue-500" />
              ) : (
                <Check className="w-4 h-4 text-gray-400" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Avatar for sent messages (right side) */}
      {isOwn && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            You
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
