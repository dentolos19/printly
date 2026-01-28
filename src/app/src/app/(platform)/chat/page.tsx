"use client";

import {
  ChatDateSeparator,
  ChatMessage,
  ConversationList,
  MessageInput,
  TypingIndicator,
  type ReplyInfo,
} from "@/components/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import { type ConversationMessage, type ConversationSummary } from "@/lib/server/conversation";
import { cn } from "@/lib/utils";
import * as signalR from "@microsoft/signalr";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HUB_URL = `${API_URL}/hubs/conversation`;

// Status labels and colors - improved visual hierarchy
const STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Resolved",
  3: "Closed",
};

const STATUS_COLORS: Record<number, string> = {
  0: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  1: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  2: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
  3: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-700",
};

const STATUS_ICONS: Record<number, typeof Circle> = {
  0: Clock,
  1: Circle,
  2: CheckCircle2,
  3: XCircle,
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "Low",
  1: "Normal",
  2: "High",
  3: "Urgent",
};

const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700",
  1: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800",
  2: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
  3: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
};

interface TypingUser {
  userId: string;
  userName: string;
  isAdmin: boolean;
}

export default function ChatPage() {
  const auth = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected" | "error">(
    "disconnected",
  );
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingOptimisticMessages, setPendingOptimisticMessages] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const selectedConversationRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = auth.claims?.id ?? null;

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const authorizedFetch = useCallback(
    async (endpoint: string, init?: RequestInit) => {
      if (!auth.tokens?.accessToken) throw new Error("Missing access token");
      const headers: HeadersInit = {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${auth.tokens.accessToken}`,
      };
      return fetch(endpoint, { ...init, headers });
    },
    [auth.tokens?.accessToken],
  );

  const fetchConversations = useCallback(async () => {
    if (!auth.tokens?.accessToken) return;
    setIsLoadingConversations(true);
    try {
      const response = await authorizedFetch(`${API_URL}/conversation`);
      if (response.ok) {
        const data = (await response.json()) as ConversationSummary[];
        setConversations(data);
        if (!selectedConversationRef.current && data.length > 0) {
          setSelectedConversationId(data[0].id);
        }
      }
    } catch (error) {
      console.error("[Chat] Failed to fetch conversations", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [authorizedFetch, auth.tokens?.accessToken]);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!auth.tokens?.accessToken) return;
      setIsLoadingMessages(true);
      try {
        const response = await authorizedFetch(`${API_URL}/conversation/${conversationId}/messages?take=200`);
        if (response.ok) {
          const data = (await response.json()) as ConversationMessage[];
          setMessages(data);
        }
      } catch (error) {
        console.error("[Chat] Failed to fetch messages", error);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [authorizedFetch, auth.tokens?.accessToken],
  );

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      if (!auth.tokens?.accessToken) return;
      try {
        if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
          await connectionRef.current.invoke("MarkConversationRead", conversationId);
        } else {
          await authorizedFetch(`${API_URL}/conversation/${conversationId}/read`, { method: "POST" });
        }
        setConversations((prev) =>
          prev.map((conv) => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv)),
        );
      } catch (error) {
        console.error("[Chat] Failed to mark read", error);
      }
    },
    [authorizedFetch, auth.tokens?.accessToken],
  );

  const startConnection = useCallback(async () => {
    if (!auth.tokens?.accessToken) return;

    if (connectionRef.current) {
      try {
        await connectionRef.current.stop();
      } catch {}
      connectionRef.current = null;
    }

    setConnectionState("connecting");

    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => auth.tokens?.accessToken ?? "",
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.ServerSentEvents |
            signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.onclose(() => setConnectionState("disconnected"));
      connection.onreconnecting(() => setConnectionState("connecting"));
      connection.onreconnected(async () => {
        setConnectionState("connected");
        const conversationId = selectedConversationRef.current;
        if (conversationId) {
          try {
            await connection.invoke("JoinConversation", conversationId);
          } catch {}
        }
      });

      connection.on("ConversationMessageReceived", (message: ConversationMessage) => {
        if (message.conversationId === selectedConversationRef.current) {
          setMessages((prev) => {
            // Remove any optimistic messages and add the real one
            const withoutOptimistic = prev.filter((m) => {
              // Remove optimistic messages that match this real message
              if (m.id.startsWith("optimistic-") && m.senderId === message.senderId && m.content === message.content) {
                // Clean up pending optimistic message tracking
                setPendingOptimisticMessages((pendingPrev) => {
                  const next = new Set(pendingPrev);
                  next.delete(m.id);
                  return next;
                });
                return false;
              }
              return true;
            });
            // Check if message already exists (avoid duplicates)
            if (withoutOptimistic.some((m) => m.id === message.id)) {
              return withoutOptimistic;
            }
            return [...withoutOptimistic, message];
          });
          if (message.senderId !== currentUserId) {
            markConversationRead(message.conversationId);
          }
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === message.conversationId
              ? {
                  ...c,
                  lastMessage: {
                    id: message.id,
                    content: message.content,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    isRead: message.isRead,
                    isDeleted: message.isDeleted,
                    isEdited: message.isEdited,
                    createdAt: message.createdAt,
                  },
                  lastMessageAt: message.createdAt,
                  unreadCount: message.conversationId === selectedConversationRef.current ? 0 : c.unreadCount + 1,
                }
              : c,
          ),
        );
      });

      connection.on(
        "ConversationMessageEdited",
        (data: { id: string; conversationId: string; content: string; isEdited: boolean; editedAt: string }) => {
          if (data.conversationId === selectedConversationRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.id
                  ? { ...m, content: data.content, isEdited: data.isEdited, editedAt: data.editedAt }
                  : m,
              ),
            );
          }
        },
      );

      connection.on(
        "ConversationMessageDeleted",
        (data: { id: string; conversationId: string; isDeleted: boolean; deletedAt: string }) => {
          if (data.conversationId === selectedConversationRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.id
                  ? { ...m, content: "This message was deleted", isDeleted: data.isDeleted, deletedAt: data.deletedAt }
                  : m,
              ),
            );
          }
        },
      );

      connection.on(
        "ConversationMessagesRead",
        (data: { conversationId: string; readerId: string; messageIds: string[]; readAt: string }) => {
          if (data.conversationId === selectedConversationRef.current) {
            setMessages((prev) =>
              prev.map((m) => (data.messageIds.includes(m.id) ? { ...m, isRead: true, readAt: data.readAt } : m)),
            );
          }
        },
      );

      connection.on("UserStartedTyping", (indicator: TypingUser & { conversationId: string }) => {
        if (indicator.conversationId === selectedConversationRef.current && indicator.userId !== currentUserId) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === indicator.userId)) return prev;
            return [...prev, { userId: indicator.userId, userName: indicator.userName, isAdmin: indicator.isAdmin }];
          });
        }
      });

      connection.on("UserStoppedTyping", (indicator: { conversationId: string; userId: string }) => {
        if (indicator.conversationId === selectedConversationRef.current) {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== indicator.userId));
        }
      });

      // Handle conversation status updates (e.g., when admin closes the conversation)
      connection.on(
        "ConversationStatusUpdated",
        (data: {
          conversationId: string;
          status: number;
          updatedByUserId: string;
          updatedByUserName: string;
          updatedAt: string;
        }) => {
          console.log("[Chat] Conversation status updated:", data);
          setConversations((prev) =>
            prev.map((c) => (c.id === data.conversationId ? { ...c, status: data.status as 0 | 1 | 2 | 3 } : c)),
          );
        },
      );

      await connection.start();
      connectionRef.current = connection;
      setConnectionState("connected");
    } catch (error) {
      console.error("[Chat] Connection failed", error);
      setConnectionState("error");
    }
  }, [auth.tokens?.accessToken, currentUserId, markConversationRead]);

  useEffect(() => {
    if (auth.tokens?.accessToken) {
      fetchConversations();
      startConnection();
    }
    return () => {
      connectionRef.current?.stop();
    };
  }, [auth.tokens?.accessToken, fetchConversations, startConnection]);

  useEffect(() => {
    if (selectedConversationId && auth.tokens?.accessToken) {
      fetchMessages(selectedConversationId);
      setTypingUsers([]);
      setReplyTo(null);

      const joinConversation = async () => {
        if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
          try {
            await connectionRef.current.invoke("JoinConversation", selectedConversationId);
            markConversationRead(selectedConversationId);
          } catch {}
        }
      };
      joinConversation();

      return () => {
        if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
          connectionRef.current.invoke("LeaveConversation", selectedConversationId).catch(() => {});
        }
      };
    }
  }, [selectedConversationId, auth.tokens?.accessToken, fetchMessages, markConversationRead]);

  const handleSendMessage = useCallback(
    async (content: string, replyToMessageId?: string) => {
      if (!selectedConversationId || !connectionRef.current || !currentUserId) return;
      if (connectionState !== "connected") {
        setLastError("Connection lost. Please wait for reconnection.");
        setTimeout(() => setLastError(null), 5000);
        return;
      }

      // Get reply info if replying
      const replyToMessage = replyToMessageId ? messages.find((m) => m.id === replyToMessageId) : null;

      // Optimistic update - show message immediately
      const optimisticId = `optimistic-${Date.now()}`;
      setPendingOptimisticMessages((prev) => new Set(prev).add(optimisticId));

      const optimisticMessage: ConversationMessage = {
        id: optimisticId,
        conversationId: selectedConversationId,
        participantId: "",
        senderId: currentUserId,
        senderName: auth.claims?.email || "You",
        content,
        isRead: false,
        readAt: null,
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        replyToMessageId: replyToMessageId || null,
        replyToContent: replyToMessage?.content || null,
        replyToSenderName: replyToMessage?.senderName || null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        voiceMessageUrl: null,
        voiceMessageDuration: null,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Update conversation list optimistically
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId
            ? {
                ...c,
                lastMessage: {
                  id: optimisticId,
                  content,
                  senderId: currentUserId,
                  senderName: optimisticMessage.senderName,
                  isRead: false,
                  isDeleted: false,
                  isEdited: false,
                  createdAt: optimisticMessage.createdAt,
                },
                lastMessageAt: optimisticMessage.createdAt,
              }
            : c,
        ),
      );

      try {
        await connectionRef.current.invoke("SendMessage", selectedConversationId, content, replyToMessageId || null);
        // Clear any previous errors
        setLastError(null);
      } catch (error) {
        console.error("[Chat] Failed to send message", error);
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setPendingOptimisticMessages((prev) => {
          const next = new Set(prev);
          next.delete(optimisticId);
          return next;
        });

        const errorMessage = error instanceof Error ? error.message : "Failed to send message";
        setLastError(`Message failed to send: ${errorMessage}`);
        setTimeout(() => setLastError(null), 5000);
      }
    },
    [selectedConversationId, currentUserId, auth.claims, messages, connectionState],
  );

  const uploadFile = useCallback(
    async (
      conversationId: string,
      file: File,
    ): Promise<{ assetId: string; fileUrl: string; fileName: string; fileType: string; fileSize: number } | null> => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await authorizedFetch(`${API_URL}/conversation/${conversationId}/upload-file`, {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          return await response.json();
        }
        console.error("[Chat] File upload failed:", await response.text());
        return null;
      } catch (error) {
        console.error("[Chat] Failed to upload file", error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [authorizedFetch],
  );

  const uploadVoice = useCallback(
    async (
      conversationId: string,
      blob: Blob,
      duration: number,
    ): Promise<{ assetId: string; voiceUrl: string; duration: number } | null> => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", blob, "voice-message.webm");
        formData.append("duration", duration.toString());
        const response = await authorizedFetch(`${API_URL}/conversation/${conversationId}/upload-voice`, {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          return await response.json();
        }
        console.error("[Chat] Voice upload failed:", await response.text());
        return null;
      } catch (error) {
        console.error("[Chat] Failed to upload voice", error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [authorizedFetch],
  );

  const handleSendFile = useCallback(
    async (file: File, content: string, replyToMessageId?: string) => {
      if (!selectedConversationId || !connectionRef.current || !currentUserId) return;

      // Create optimistic file message
      const optimisticId = `optimistic-file-${Date.now()}`;
      const replyToMessage = replyToMessageId ? messages.find((m) => m.id === replyToMessageId) : null;

      const optimisticMessage: ConversationMessage = {
        id: optimisticId,
        conversationId: selectedConversationId,
        participantId: "",
        senderId: currentUserId,
        senderName: auth.claims?.email || "You",
        content: content || file.name,
        isRead: false,
        readAt: null,
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        replyToMessageId: replyToMessageId || null,
        replyToContent: replyToMessage?.content || null,
        replyToSenderName: replyToMessage?.senderName || null,
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        voiceMessageUrl: null,
        voiceMessageDuration: null,
      };

      // Show optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);
      setPendingOptimisticMessages((prev) => new Set(prev).add(optimisticId));

      try {
        const uploadResult = await uploadFile(selectedConversationId, file);
        if (!uploadResult) {
          // Remove optimistic message on failure
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setPendingOptimisticMessages((prev) => {
            const next = new Set(prev);
            next.delete(optimisticId);
            return next;
          });
          setLastError("Failed to upload file");
          setTimeout(() => setLastError(null), 5000);
          return;
        }
        await connectionRef.current.invoke(
          "SendMessageWithFile",
          selectedConversationId,
          content,
          uploadResult.assetId,
          uploadResult.fileUrl,
          uploadResult.fileName,
          uploadResult.fileType,
          uploadResult.fileSize,
          replyToMessageId || null,
        );
      } catch (error) {
        console.error("[Chat] Failed to send file message", error);
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setPendingOptimisticMessages((prev) => {
          const next = new Set(prev);
          next.delete(optimisticId);
          return next;
        });
        setLastError("Failed to send file");
        setTimeout(() => setLastError(null), 5000);
      }
    },
    [selectedConversationId, uploadFile],
  );

  const handleSendVoice = useCallback(
    async (blob: Blob, duration: number, replyToMessageId?: string) => {
      if (!selectedConversationId || !connectionRef.current) return;
      try {
        const uploadResult = await uploadVoice(selectedConversationId, blob, duration);
        if (!uploadResult) {
          console.error("[Chat] Voice upload failed");
          return;
        }
        await connectionRef.current.invoke(
          "SendVoiceMessage",
          selectedConversationId,
          uploadResult.assetId,
          uploadResult.voiceUrl,
          uploadResult.duration,
          replyToMessageId || null,
        );
      } catch (error) {
        console.error("[Chat] Failed to send voice message", error);
      }
    },
    [selectedConversationId, uploadVoice],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!connectionRef.current) return;
      // Skip optimistic messages (non-GUID IDs)
      if (messageId.startsWith("optimistic-")) return;

      // Optimistic update
      const originalMessage = messages.find((m) => m.id === messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: newContent, isEdited: true, editedAt: new Date().toISOString() } : m,
        ),
      );

      try {
        await connectionRef.current.invoke("EditMessage", messageId, newContent);
      } catch (error) {
        console.error("[Chat] Failed to edit message", error);
        // Revert on failure
        if (originalMessage) {
          setMessages((prev) => prev.map((m) => (m.id === messageId ? originalMessage : m)));
        }
      }
    },
    [messages],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!connectionRef.current) return;
      // Skip optimistic messages (non-GUID IDs)
      if (messageId.startsWith("optimistic-")) return;

      // Optimistic update
      const originalMessage = messages.find((m) => m.id === messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: "This message was deleted", isDeleted: true, deletedAt: new Date().toISOString() }
            : m,
        ),
      );

      try {
        await connectionRef.current.invoke("DeleteMessage", messageId);
      } catch (error) {
        console.error("[Chat] Failed to delete message", error);
        // Revert on failure
        if (originalMessage) {
          setMessages((prev) => prev.map((m) => (m.id === messageId ? originalMessage : m)));
        }
      }
    },
    [messages],
  );

  const handleTypingStart = useCallback(() => {
    if (!selectedConversationId || !connectionRef.current) return;
    connectionRef.current.invoke("StartTyping", selectedConversationId).catch(() => {});
  }, [selectedConversationId]);

  const handleTypingStop = useCallback(() => {
    if (!selectedConversationId || !connectionRef.current) return;
    connectionRef.current.invoke("StopTyping", selectedConversationId).catch(() => {});
  }, [selectedConversationId]);

  const handleCreateConversation = useCallback(async () => {
    if (!newSubject.trim()) return;
    setIsCreating(true);
    try {
      const response = await authorizedFetch(`${API_URL}/conversation/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject.trim(),
          initialMessage: newMessage.trim() || null,
        }),
      });
      if (response.ok) {
        const conversation = (await response.json()) as ConversationSummary;
        setConversations((prev) => [conversation, ...prev]);
        setSelectedConversationId(conversation.id);
        setNewConversationOpen(false);
        setNewSubject("");
        setNewMessage("");
      }
    } catch (error) {
      console.error("[Chat] Failed to create conversation", error);
    } finally {
      setIsCreating(false);
    }
  }, [newSubject, newMessage, authorizedFetch]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ConversationMessage[] }[] = [];
    let currentDate = "";

    for (const message of messages) {
      const messageDate = new Date(message.createdAt).toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: message.createdAt, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    }

    return groups;
  }, [messages]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const handleCreateNew = useCallback(() => {
    setNewConversationOpen(true);
  }, []);

  return (
    <main className="flex h-[calc(100vh-4rem)] w-full flex-col gap-3 p-3">
      {/* Header Bar - Compact */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="gap-2">
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            <span className="hidden sm:inline">{sidebarCollapsed ? "Show" : "Hide"}</span>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Support Chat</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              connectionState === "connected"
                ? "default"
                : connectionState === "connecting"
                  ? "secondary"
                  : "destructive"
            }
            className="gap-1 px-2 py-0.5 text-xs"
          >
            {connectionState === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="hidden sm:inline">
              {connectionState === "connected"
                ? "Connected"
                : connectionState === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
            </span>
          </Badge>
          <Button variant="ghost" size="icon" onClick={fetchConversations} disabled={isLoadingConversations}>
            <RefreshCw className={cn("h-4 w-4", isLoadingConversations && "animate-spin")} />
          </Button>
          <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Support Conversation</DialogTitle>
                <DialogDescription>Describe your inquiry and our team will get back to you shortly.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Order inquiry, Technical issue"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue or question..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewConversationOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateConversation} disabled={!newSubject.trim() || isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start Conversation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Conversation List - Collapsible */}
        <Card
          className={cn(
            "flex flex-shrink-0 flex-col transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-0 overflow-hidden border-0 opacity-0" : "w-72 lg:w-80",
          )}
        >
          <CardHeader className="border-b px-3 py-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              isLoading={isLoadingConversations}
              showStatus
              showPriority
              emptyMessage="No conversations yet. Start one!"
            />
          </ScrollArea>
        </Card>

        {/* Chat Area - Expands when sidebar collapses */}
        <Card className="flex min-w-0 flex-1 flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="flex-shrink-0 gap-0 space-y-0 border-b px-2 py-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const StatusIcon = STATUS_ICONS[selectedConversation.status] || Circle;
                      return (
                        <StatusIcon
                          className={cn(
                            "h-5 w-5",
                            selectedConversation.status === 0
                              ? "text-amber-500"
                              : selectedConversation.status === 1
                                ? "text-emerald-500"
                                : selectedConversation.status === 2
                                  ? "text-blue-500"
                                  : "text-gray-400",
                          )}
                        />
                      );
                    })()}
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {selectedConversation.subject || "Conversation"}
                      </CardTitle>
                      <p className="text-muted-foreground truncate text-sm">Printly Customer Support 😊</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("gap-1 border px-2 py-0.5 text-xs", STATUS_COLORS[selectedConversation.status])}
                    >
                      {STATUS_LABELS[selectedConversation.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("gap-1 border px-2 py-0.5 text-xs", PRIORITY_COLORS[selectedConversation.priority])}
                    >
                      {selectedConversation.priority === 3 && <AlertCircle className="h-3 w-3" />}
                      {PRIORITY_LABELS[selectedConversation.priority]}
                    </Badge>
                  </div>
                </div>
                {lastError && (
                  <div className="bg-destructive/10 text-destructive border-destructive/20 mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <WifiOff className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{lastError}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLastError(null)}
                      className="text-destructive hover:text-destructive h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <ScrollArea className="min-h-0 flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center">
                      <MessageSquarePlus className="h-16 w-16" />
                      <p className="mt-4">No messages yet.</p>
                      <p className="text-sm">Send a message to start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {groupedMessages.map((group) => (
                        <div key={group.date}>
                          <ChatDateSeparator date={group.date} />
                          {group.messages.map((message) => (
                            <ChatMessage
                              key={message.id}
                              id={message.id}
                              content={message.content}
                              senderName={message.senderName}
                              senderId={message.senderId}
                              isCurrentUser={message.senderId === currentUserId}
                              isRead={message.isRead}
                              isEdited={message.isEdited}
                              isDeleted={message.isDeleted}
                              createdAt={message.createdAt}
                              editedAt={message.editedAt}
                              replyToContent={message.replyToContent}
                              replyToSenderName={message.replyToSenderName}
                              fileUrl={message.fileUrl}
                              fileName={message.fileName}
                              fileType={message.fileType}
                              fileSize={message.fileSize}
                              voiceMessageUrl={message.voiceMessageUrl}
                              voiceMessageDuration={message.voiceMessageDuration}
                              onReply={() =>
                                setReplyTo({
                                  messageId: message.id,
                                  senderName: message.senderName,
                                  content: message.content,
                                })
                              }
                              onEdit={
                                message.senderId === currentUserId && !message.isDeleted
                                  ? (content) => handleEditMessage(message.id, content)
                                  : undefined
                              }
                              onDelete={
                                message.senderId === currentUserId && !message.isDeleted
                                  ? () => handleDeleteMessage(message.id)
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </ScrollArea>

                <TypingIndicator users={typingUsers} />

                {/* Show closed banner when conversation is closed, otherwise show message input */}
                {selectedConversation.status === 3 ? (
                  <div className="bg-muted/50 flex-shrink-0 border-t p-4">
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                      <XCircle className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        This conversation has been closed by support.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-shrink-0 border-t p-4">
                    <MessageInput
                      onSend={handleSendMessage}
                      onSendFile={handleSendFile}
                      onSendVoice={handleSendVoice}
                      onTypingStart={handleTypingStart}
                      onTypingStop={handleTypingStop}
                      disabled={connectionState !== "connected" || isUploading}
                      replyTo={replyTo}
                      onCancelReply={() => setReplyTo(null)}
                      allowFileUpload
                      allowVoiceMessage
                    />
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center p-8">
              <MessageSquarePlus className="h-16 w-16 opacity-50" />
              <p className="mt-4 text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Or start a new one to get help from our support team</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
