"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConversationPriority, ConversationStatus, type ConversationSummary } from "@/lib/server/conversation";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, MessageSquare, Plus, Search, XCircle } from "lucide-react";
import { forwardRef, useState } from "react";

export interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  showStatus?: boolean;
  showPriority?: boolean;
  showCustomerName?: boolean;
  showAssignment?: boolean;
  onCreateNew?: () => void;
  showHeader?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
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
    case 1: // Active/Open
      return "default";
    case 2: // Resolved
      return "outline";
    case 3: // Closed
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusText(status: ConversationStatus): string {
  switch (status) {
    case 0:
      return "Pending";
    case 1:
      return "Open";
    case 2:
      return "Resolved";
    case 3:
      return "Closed";
    default:
      return "Unknown";
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
      showAssignment = false,
      onCreateNew,
      showHeader = true,
      showSearch = true,
      showFilter = true,
    },
    ref,
  ) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center p-12">
          <div className="text-muted-foreground flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-current border-t-transparent" />
            <span className="text-sm font-medium">Loading conversations...</span>
          </div>
        </div>
      );
    }

    const filteredConversations = conversations.filter((conv) => {
      const matchesSearch =
        !searchQuery ||
        (showCustomerName ? conv.customerName : conv.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && conv.status === 0) ||
        (statusFilter === "open" && conv.status === 1) ||
        (statusFilter === "resolved" && conv.status === 2) ||
        (statusFilter === "closed" && conv.status === 3);

      return matchesSearch && matchesStatus;
    });

    if (conversations.length === 0) {
      return (
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-12">
          <div className="bg-muted/50 rounded-full p-4">
            <MessageSquare className="h-10 w-10 opacity-40" />
          </div>
          <p className="text-foreground text-sm font-medium">{emptyMessage}</p>
        </div>
      );
    }

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && conv.status === 0) ||
        (statusFilter === "open" && conv.status === 1) ||
        (statusFilter === "resolved" && conv.status === 2) ||
        (statusFilter === "closed" && conv.status === 3);

      return matchesSearch && matchesStatus;
    });

    return (
      <div className="bg-background flex h-full flex-col border-r">
        {showHeader && (
          <div className="border-b p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Messages</h2>
              {onCreateNew && (
                <Button size="icon" variant="default" className="h-8 w-8 rounded-full" onClick={onCreateNew}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {showSearch && (
              <div className="relative mb-3">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "hover:bg-accent/50 flex w-full items-start gap-3 border-b px-4 py-3.5 text-left transition-all duration-200",
                  "border-l-4 hover:shadow-sm",
                  showPriority ? getPriorityCardBorder(conversation.priority) : "border-l-transparent",
                  isSelected && "bg-accent shadow-sm",
                  requiresAttention && "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10",
                )}
              >
                <Avatar className="ring-border/5 h-11 w-11 shrink-0 ring-2">
                  <AvatarFallback
                    className={cn("text-sm font-semibold", showPriority && getPriorityColor(conversation.priority))}
                  >
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

            {showFilter && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conversations</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-semibold",
                        showPriority && getPriorityColor(conversation.priority),
                      )}
                      title={displayName}
                    >
                      {displayName}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs font-medium">
                      {formatRelativeTime(conversation.lastMessageAt || conversation.createdAt)}
                    </span>
                  </div>

        {isLoading ? (
          <div className="flex h-full items-center justify-center p-12">
            <div className="text-muted-foreground flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-current border-t-transparent" />
              <span className="text-sm font-medium">Loading conversations...</span>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-12">
            <div className="bg-muted/50 rounded-full p-4">
              <MessageSquare className="h-10 w-10 opacity-40" />
            </div>
            <p className="text-foreground text-sm font-medium">{searchQuery ? "No conversations found" : emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea ref={ref} className="flex-1">
            <div className="flex flex-col">
              {filteredConversations.map((conversation) => {
                const isSelected = selectedId === conversation.id;
                const displayName = showCustomerName
                  ? conversation.customerName
                  : conversation.subject || "Conversation";
                const lastMessageContent = conversation.lastMessage?.isDeleted
                  ? "Message deleted"
                  : conversation.lastMessage?.content || "No messages yet";

                return (
                  <button
                    key={conversation.id}
                    onClick={() => onSelect(conversation.id)}
                    className={cn(
                      "hover:bg-accent/50 flex w-full items-start gap-3 border-b px-4 py-3.5 text-left transition-all duration-200",
                      "border-l-4 hover:shadow-sm",
                      showPriority ? getPriorityCardBorder(conversation.priority) : "border-l-transparent",
                      isSelected && "bg-accent shadow-sm",
                      requiresAttention && "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10",
                    )}
                  >
                    <Avatar className="ring-border/5 h-11 w-11 shrink-0 ring-2">
                      <AvatarFallback
                        className={cn("text-sm font-semibold", showPriority && getPriorityColor(conversation.priority))}
                      >
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-semibold",
                            showPriority && getPriorityColor(conversation.priority),
                          )}
                          title={displayName}
                        >
                          {displayName}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs font-medium">
                          {formatRelativeTime(conversation.lastMessageAt || conversation.createdAt)}
                        </span>
                      </div>
                      {(showStatus || showAssignment) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {showStatus && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1 px-2 py-0.5 text-[10px] font-medium",
                                getStatusBadgeClasses(conversation.status),
                              )}
                            >
                              {getStatusIcon(conversation.status)}
                              {getStatusLabel(conversation.status)}
                            </Badge>
                          )}
                          {showPriority && conversation.priority >= 2 && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1 px-2 py-0.5 text-[10px] font-medium",
                                getPriorityBadgeClasses(conversation.priority),
                              )}
                            >
                              {getPriorityIcon(conversation.priority)}
                              {getPriorityLabel(conversation.priority)}
                            </Badge>
                          )}
                          )}
                        </div>
                      </div>

                      {showAssignment && conversation.assignedToAdminName && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-blue-200 bg-blue-50/50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400"
                          title={conversation.assignedToAdminName}
                        >
                          <User className="h-2.5 w-2.5" />
                          <span className="max-w-[70px] truncate">{conversation.assignedToAdminName}</span>
                        </Badge>
                      )}

                      <p className="text-muted-foreground line-clamp-2 text-sm">{lastMessageContent}</p>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs">
                          {formatRelativeTime(conversation.lastMessageAt || conversation.createdAt)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge className="h-5 min-w-[20px] shrink-0 justify-center rounded-full px-1.5 text-xs">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground min-w-0 flex-1 text-xs leading-relaxed">
                      {conversation.lastMessage ? (
                        <>
                          <span className="text-foreground/70 font-medium" title={conversation.lastMessage.senderName}>
                            {conversation.lastMessage.senderName}
                          </span>
                          <span className="mx-1">·</span>
                          <span className="truncate" title={lastMessageContent}>
                            {lastMessageContent}
                          </span>
                        </>
                      ) : (
                        <span className="truncate italic" title={lastMessageContent}>
                          {lastMessageContent}
                        </span>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge className="h-5 min-w-[20px] shrink-0 justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold hover:bg-blue-600">
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
