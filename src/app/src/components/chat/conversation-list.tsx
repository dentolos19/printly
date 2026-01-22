"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ConversationPriority,
  ConversationPriorityLabels,
  ConversationStatus,
  ConversationStatusLabels,
  type ConversationSummary,
} from "@/lib/server/conversation";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Clock, MessageSquare, XCircle } from "lucide-react";
import { forwardRef } from "react";

export interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  showStatus?: boolean;
  showPriority?: boolean;
  showCustomerName?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getStatusIcon(status: ConversationStatus) {
  switch (status) {
    case 0: // Pending
      return <Clock className="h-3 w-3" />;
    case 1: // Active
      return <MessageSquare className="h-3 w-3" />;
    case 2: // Resolved
      return <CheckCircle className="h-3 w-3" />;
    case 3: // Closed
      return <XCircle className="h-3 w-3" />;
    default:
      return null;
  }
}

function getStatusVariant(status: ConversationStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 0: // Pending
      return "secondary";
    case 1: // Active
      return "default";
    case 2: // Resolved
      return "outline";
    case 3: // Closed
      return "outline";
    default:
      return "secondary";
  }
}

function getPriorityColor(priority: ConversationPriority): string {
  switch (priority) {
    case 0: // Low
      return "text-muted-foreground";
    case 1: // Normal
      return "text-foreground";
    case 2: // High
      return "text-orange-500";
    case 3: // Urgent
      return "text-destructive";
    default:
      return "text-foreground";
  }
}

export const ConversationList = forwardRef<HTMLDivElement, ConversationListProps>(
  (
    {
      conversations,
      selectedId,
      onSelect,
      isLoading,
      emptyMessage = "No conversations yet",
      showStatus = false,
      showPriority = false,
      showCustomerName = false,
    },
    ref,
  ) => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-8">
          <MessageSquare className="h-12 w-12" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <ScrollArea ref={ref} className="h-full">
        <div className="flex flex-col">
          {conversations.map((conversation) => {
            const isSelected = selectedId === conversation.id;
            const displayName = showCustomerName ? conversation.customerName : conversation.subject || "Conversation";
            const lastMessageContent = conversation.lastMessage?.isDeleted
              ? "Message deleted"
              : conversation.lastMessage?.content || "No messages yet";

            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "hover:bg-muted/50 flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors",
                  isSelected && "bg-muted",
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn("truncate font-medium", showPriority && getPriorityColor(conversation.priority))}
                    >
                      {displayName}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatRelativeTime(conversation.lastMessageAt || conversation.createdAt)}
                    </span>
                  </div>

                  {showStatus && (
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant={getStatusVariant(conversation.status)} className="gap-1 px-1.5 py-0 text-[10px]">
                        {getStatusIcon(conversation.status)}
                        {ConversationStatusLabels[conversation.status]}
                      </Badge>
                      {showPriority && conversation.priority >= 2 && (
                        <Badge
                          variant="outline"
                          className={cn("px-1.5 py-0 text-[10px]", getPriorityColor(conversation.priority))}
                        >
                          <AlertCircle className="mr-0.5 h-2.5 w-2.5" />
                          {ConversationPriorityLabels[conversation.priority]}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-muted-foreground truncate text-sm">
                      {conversation.lastMessage && (
                        <span className="font-medium">{conversation.lastMessage.senderName}: </span>
                      )}
                      {lastMessageContent}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge className="h-5 min-w-[20px] shrink-0 justify-center rounded-full px-1.5 text-xs">
                        {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    );
  },
);

ConversationList.displayName = "ConversationList";
