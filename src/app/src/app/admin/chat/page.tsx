"use client";

import { CallInterface, IncomingCallNotification } from "@/components/call-interface";
import {
  CallMessage,
  ChatDateSeparator,
  ChatMessage,
  ConversationList,
  MessageInput,
  TypingIndicator,
  type ReplyInfo,
} from "@/components/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import {
  type AdminInfo,
  type ConversationMessage,
  type ConversationPriority,
  type ConversationStatus,
  type ConversationSummary,
} from "@/lib/server/conversation";
import { CallType, type CallTokenResponse, type IncomingCallData } from "@/lib/types/call";
import { cn } from "@/lib/utils";
import * as signalR from "@microsoft/signalr";
import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  RefreshCw,
  User,
  Video,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HUB_URL = `${API_URL}/hubs/conversation`;

interface TypingUser {
  userId: string;
  userName: string;
  isAdmin: boolean;
}

const STATUS_ICONS: Record<ConversationStatus, typeof Clock> = {
  0: Clock, // Pending
  1: MessageSquare, // Active
  2: CheckCircle2, // Resolved
  3: XCircle, // Closed
};

const STATUS_COLORS: Record<ConversationStatus, string> = {
  0: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
  1: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400",
  2: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400",
  3: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<ConversationPriority, string> = {
  0: "text-slate-500", // Low
  1: "text-sky-600", // Normal
  2: "text-orange-500", // High
  3: "text-red-500", // Urgent
};

export default function AdminChatPage() {
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingOptimisticMessages, setPendingOptimisticMessages] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<{
    callId: string;
    token: string;
    serverUrl: string;
    callType: CallType;
  } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

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
      const params = new URLSearchParams({ includeAllForStaff: "true" });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const response = await authorizedFetch(`${API_URL}/conversation?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as ConversationSummary[];
        setConversations(data);
        if (!selectedConversationRef.current && data.length > 0) {
          setSelectedConversationId(data[0].id);
        }
      }
    } catch (error) {
      console.error("[Admin Chat] Failed to fetch conversations", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [authorizedFetch, auth.tokens?.accessToken, statusFilter]);

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
        console.error("[Admin Chat] Failed to fetch messages", error);
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
        console.error("[Admin Chat] Failed to mark read", error);
      }
    },
    [authorizedFetch, auth.tokens?.accessToken],
  );

  const updateConversationStatus = useCallback(
    async (conversationId: string, status: ConversationStatus) => {
      try {
        const response = await authorizedFetch(`${API_URL}/conversation/${conversationId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (response.ok) {
          setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, status } : c)));
        } else {
          console.error("[Admin Chat] Failed to update status - response not ok", await response.text());
        }
      } catch (error) {
        console.error("[Admin Chat] Failed to update status", error);
      }
    },
    [authorizedFetch],
  );

  const updateConversationPriority = useCallback(
    async (conversationId: string, priority: ConversationPriority) => {
      try {
        const response = await authorizedFetch(`${API_URL}/conversation/${conversationId}/priority`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        });
        if (response.ok) {
          setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, priority } : c)));
        } else {
          console.error("[Admin Chat] Failed to update priority - response not ok", await response.text());
        }
      } catch (error) {
        console.error("[Admin Chat] Failed to update priority", error);
      }
    },
    [authorizedFetch],
  );

  const fetchAdmins = useCallback(async () => {
    if (!auth.tokens?.accessToken) return;
    try {
      const response = await authorizedFetch(`${API_URL}/conversation/admins`);
      if (response.ok) {
        const data = (await response.json()) as AdminInfo[];
        setAdmins(data);
      }
    } catch (error) {
      console.error("[Admin Chat] Failed to fetch admins", error);
    }
  }, [authorizedFetch, auth.tokens?.accessToken]);

  const assignConversation = useCallback(
    async (conversationId: string, adminId: string | null) => {
      try {
        const response = await authorizedFetch(`${API_URL}/conversation/${conversationId}/assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId }),
        });
        if (response.ok) {
          const assignedAdmin = adminId ? admins.find((a) => a.id === adminId) : null;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? { ...c, assignedToAdminId: adminId, assignedToAdminName: assignedAdmin?.userName ?? null }
                : c,
            ),
          );
        }
      } catch (error) {
        console.error("[Admin Chat] Failed to assign conversation", error);
      }
    },
    [authorizedFetch, admins],
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
        console.error("[Admin Chat] File upload failed:", await response.text());
        return null;
      } catch (error) {
        console.error("[Admin Chat] Failed to upload file", error);
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
        console.error("[Admin Chat] Voice upload failed:", await response.text());
        return null;
      } catch (error) {
        console.error("[Admin Chat] Failed to upload voice", error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [authorizedFetch],
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
            await connection.invoke("JoinConversation", conversationId, true);
          } catch {}
        }
      });

      connection.on("ConversationMessageReceived", (message: ConversationMessage) => {
        if (message.conversationId === selectedConversationRef.current) {
          setMessages((prev) => {
            // Remove any optimistic messages and add the real one
            const withoutOptimistic = prev.filter((m) => {
              // Only check optimistic messages from the same sender
              if (!m.id.startsWith("optimistic-") || m.senderId !== message.senderId) {
                return true;
              }

              // Match text messages by content
              const contentMatch = m.content === message.content;

              // Match file messages by filename (content might differ between optimistic and real)
              const fileMatch =
                m.id.startsWith("optimistic-file-") &&
                m.fileName != null &&
                message.fileName != null &&
                m.fileName === message.fileName;

              // Match voice messages by the optimistic prefix
              const voiceMatch = m.id.startsWith("optimistic-voice-") && message.voiceMessageUrl != null;

              if (contentMatch || fileMatch || voiceMatch) {
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
            if (withoutOptimistic.some((existing) => existing.id === message.id)) {
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

      // Handle conversation status updates from other admins
      connection.on(
        "ConversationStatusUpdated",
        (data: {
          conversationId: string;
          status: number;
          updatedByUserId: string;
          updatedByUserName: string;
          updatedAt: string;
        }) => {
          console.log("[Admin Chat] Conversation status updated:", data);
          setConversations((prev) =>
            prev.map((c) => (c.id === data.conversationId ? { ...c, status: data.status as 0 | 1 | 2 | 3 } : c)),
          );
        },
      );

      // Call event handlers
      connection.on("IncomingCall", (data: IncomingCallData) => {
        console.log("[Admin Chat] Incoming call:", data);
        setActiveCallId(data.callId);

        // If we initiated the call, we already auto-joined in handleInitiateCall
        // Only show incoming notification for recipients
        if (data.initiatorId !== currentUserId) {
          setIncomingCall(data);
        }
      });

      connection.on("UserJoinedCall", (data: { callId: string; userId: string; userName: string }) => {
        console.log("[Admin Chat] User joined call:", data);

        // Update call message status to Ongoing (1) when someone joins
        setMessages((prev) =>
          prev.map((m) =>
            m.callLogId === data.callId && m.callStatus === 0 ? { ...m, callStatus: 1 as 0 | 1 | 2 | 3 | 4 | 5 } : m,
          ),
        );
      });

      connection.on("UserLeftCall", (data: { callId: string; userId: string; userName: string }) => {
        console.log("[Admin Chat] User left call:", data);
      });

      connection.on("CallEnded", (data: { callId: string; duration: number | null; status: number }) => {
        console.log("[Admin Chat] Call ended:", data);

        if (currentCall?.callId === data.callId || activeCallId === data.callId) {
          setIsInCall(false);
          setCurrentCall(null);
          setActiveCallId(null);
        }

        // Update the call message card in real-time
        setMessages((prev) =>
          prev.map((m) =>
            m.callLogId === data.callId
              ? {
                  ...m,
                  callStatus: data.status as 0 | 1 | 2 | 3 | 4 | 5,
                  callDurationSeconds: data.duration,
                }
              : m,
          ),
        );
      });

      connection.on("CallDeclined", (data: { callId: string; userId: string; status: number }) => {
        console.log("[Admin Chat] Call declined:", data);

        if (incomingCall?.callId === data.callId) {
          setIncomingCall(null);
        }

        if (currentCall?.callId === data.callId || activeCallId === data.callId) {
          setIsInCall(false);
          setCurrentCall(null);
          setActiveCallId(null);
        }

        // Update the call message card to show declined status
        setMessages((prev) =>
          prev.map((m) =>
            m.callLogId === data.callId
              ? {
                  ...m,
                  callStatus: data.status as 0 | 1 | 2 | 3 | 4 | 5,
                }
              : m,
          ),
        );
      });

      await connection.start();
      connectionRef.current = connection;
      setConnectionState("connected");

      // Join the selected conversation if one is already selected
      const conversationId = selectedConversationRef.current;
      if (conversationId) {
        try {
          await connection.invoke("JoinConversation", conversationId, true);
        } catch {}
      }
    } catch (error) {
      console.error("[Admin Chat] Connection failed", error);
      setConnectionState("error");
    }
  }, [auth.tokens?.accessToken, currentUserId, markConversationRead]);

  useEffect(() => {
    if (auth.tokens?.accessToken) {
      fetchConversations();
      fetchAdmins();
      startConnection();
    }
    return () => {
      connectionRef.current?.stop();
    };
  }, [auth.tokens?.accessToken, startConnection]);

  useEffect(() => {
    fetchConversations();
  }, [statusFilter, fetchConversations]);

  useEffect(() => {
    if (selectedConversationId && auth.tokens?.accessToken) {
      fetchMessages(selectedConversationId);
      setTypingUsers([]);
      setReplyTo(null);

      const joinConversation = async () => {
        if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
          try {
            await connectionRef.current.invoke("JoinConversation", selectedConversationId, true);
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
        console.error("[Admin Chat] Failed to send message", error);
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
        senderName: auth.claims?.email || "Admin",
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
        console.error("[Admin Chat] Failed to send file message", error);
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
    [selectedConversationId, uploadFile, currentUserId, auth.claims, messages],
  );

  const handleSendVoice = useCallback(
    async (blob: Blob, duration: number, replyToMessageId?: string) => {
      if (!selectedConversationId || !connectionRef.current) return;
      try {
        const uploadResult = await uploadVoice(selectedConversationId, blob, duration);
        if (!uploadResult) {
          console.error("[Admin Chat] Voice upload failed");
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
        console.error("[Admin Chat] Failed to send voice message", error);
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
        console.error("[Admin Chat] Failed to edit message", error);
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
        console.error("[Admin Chat] Failed to delete message", error);
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

  // Call handlers
  const handleInitiateCall = useCallback(
    async (callType: CallType) => {
      if (!selectedConversationId || !connectionRef.current || !auth.tokens?.accessToken) return;

      try {
        // Invoke InitiateCall - server will return the callId
        const callId = await connectionRef.current.invoke<string>("InitiateCall", selectedConversationId, callType);
        console.log("[Admin Chat] Call initiated:", callType, "callId:", callId);

        // Immediately get token and join the call as the initiator
        if (callId) {
          setActiveCallId(callId);

          const response = await fetch(`${API_URL}/conversation/call/${callId}/token`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${auth.tokens.accessToken}`,
            },
          });

          if (response.ok) {
            const tokenData: CallTokenResponse = await response.json();
            setCurrentCall({
              callId,
              token: tokenData.token,
              serverUrl: tokenData.wsUrl,
              callType,
            });
            setIsInCall(true);
            console.log("[Admin Chat] Auto-joined call as initiator:", callId);
          } else {
            console.error("[Admin Chat] Failed to get call token");
            setLastError("Failed to get call token. Please try again.");
            setTimeout(() => setLastError(null), 5000);
          }
        }
      } catch (error) {
        console.error("[Admin Chat] Failed to initiate call:", error);
        setLastError("Failed to start call. Please try again.");
        setTimeout(() => setLastError(null), 5000);
      }
    },
    [selectedConversationId, auth.tokens?.accessToken],
  );

  const handleAnswerCall = useCallback(
    async (callId: string, callType: CallType) => {
      if (!connectionRef.current || !auth.tokens?.accessToken) return;

      try {
        await connectionRef.current.invoke("AnswerCall", callId);

        const response = await authorizedFetch(`${API_URL}/conversation/call/${callId}/token`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to get call token");
        }

        const tokenData: CallTokenResponse = await response.json();

        setCurrentCall({
          callId,
          token: tokenData.token,
          serverUrl: tokenData.wsUrl,
          callType,
        });
        setIsInCall(true);
        setIncomingCall(null);

        console.log("[Admin Chat] Joined call:", callId);
      } catch (error) {
        console.error("[Admin Chat] Failed to answer call:", error);
        setLastError("Failed to join call. Please try again.");
        setTimeout(() => setLastError(null), 5000);
      }
    },
    [auth.tokens?.accessToken, authorizedFetch],
  );

  const handleDeclineCall = useCallback(async (callId: string) => {
    if (!connectionRef.current) return;

    try {
      await connectionRef.current.invoke("DeclineCall", callId);
      setIncomingCall(null);
      console.log("[Admin Chat] Call declined:", callId);
    } catch (error) {
      console.error("[Admin Chat] Failed to decline call:", error);
    }
  }, []);

  const handleLeaveCall = useCallback(async () => {
    if (!currentCall || !connectionRef.current) return;

    try {
      await connectionRef.current.invoke("EndCall", currentCall.callId);
    } catch (error) {
      console.error("[Admin Chat] Failed to leave call:", error);
    } finally {
      setIsInCall(false);
      setCurrentCall(null);
      setActiveCallId(null);
      console.log("[Admin Chat] Left call");
    }
  }, [currentCall]);

  const handleJoinActiveCall = useCallback(
    async (callLogId: string) => {
      if (!connectionRef.current || !auth.tokens?.accessToken) return;

      try {
        // Get call details first
        const detailsResponse = await authorizedFetch(`${API_URL}/conversation/call/${callLogId}`);
        if (!detailsResponse.ok) {
          throw new Error("Failed to get call details");
        }
        const callDetails = (await detailsResponse.json()) as { status: number; type: number };

        // Only join if call is still active (Ongoing = 1)
        if (callDetails.status !== 1) {
          setLastError("This call has ended.");
          setTimeout(() => setLastError(null), 3000);
          return;
        }

        await connectionRef.current.invoke("AnswerCall", callLogId);

        const response = await authorizedFetch(`${API_URL}/conversation/call/${callLogId}/token`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to get call token");
        }

        const tokenData: CallTokenResponse = await response.json();

        setCurrentCall({
          callId: callLogId,
          token: tokenData.token,
          serverUrl: tokenData.wsUrl,
          callType: callDetails.type as CallType,
        });
        setIsInCall(true);
        setIncomingCall(null);

        console.log("[Admin Chat] Joined active call:", callLogId);
      } catch (error) {
        console.error("[Admin Chat] Failed to join call:", error);
        setLastError("Failed to join call. Please try again.");
        setTimeout(() => setLastError(null), 5000);
      }
    },
    [auth.tokens?.accessToken, authorizedFetch],
  );

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
  const StatusIcon = selectedConversation ? STATUS_ICONS[selectedConversation.status] : MessageSquare;

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => c.supportMode);
  }, [conversations]);

  return (
    <main className="flex h-full w-full flex-col gap-3 overflow-hidden p-3">
      {/* Header Bar - Compact */}
      <div className="bg-card flex shrink-0 items-center justify-between rounded-lg border px-3 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hover:bg-accent h-8 gap-1.5 px-2"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            <span className="hidden font-medium sm:inline">{sidebarCollapsed ? "Show" : "Hide"}</span>
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Support Inbox</h1>
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
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchConversations}
            disabled={isLoadingConversations}
            className="hover:bg-accent h-7 w-7"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingConversations && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* Conversation List - Collapsible */}
        <Card
          className={cn(
            "flex shrink-0 flex-col overflow-hidden shadow-sm transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-0 overflow-hidden border-0 opacity-0" : "w-80 lg:w-80",
          )}
        >
          <CardHeader className="border-b px-3 py-2">
            <CardTitle className="text-sm font-semibold">Conversations</CardTitle>
          </CardHeader>
          <div className="shrink-0 border-b p-3">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="grid h-8 w-full grid-cols-5">
                <TabsTrigger value="all" className="px-1.5 text-[11px] font-medium">
                  All
                </TabsTrigger>
                <TabsTrigger value="0" className="px-1.5 text-[11px] font-medium">
                  Pending
                </TabsTrigger>
                <TabsTrigger value="1" className="px-1.5 text-[11px] font-medium">
                  Active
                </TabsTrigger>
                <TabsTrigger value="2" className="px-1.5 text-[11px] font-medium">
                  Resolved
                </TabsTrigger>
                <TabsTrigger value="3" className="px-1.5 text-[11px] font-medium">
                  Closed
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              isLoading={isLoadingConversations}
              showStatus
              showPriority
              showAssignment
              showCustomerName
              showHeader={false}
              emptyMessage="No support conversations found"
            />
          </ScrollArea>
        </Card>

        {/* Chat Area - Expands when sidebar collapses */}
        <Card className="flex min-w-0 flex-1 flex-col overflow-hidden shadow-sm">
          {selectedConversation ? (
            <>
              <CardHeader className="bg-muted/30 shrink-0 gap-0 space-y-0 border-b px-3 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <StatusIcon
                      className={cn("mt-0.5 h-4 w-4 shrink-0", PRIORITY_COLORS[selectedConversation.priority])}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
                      <CardTitle
                        className="truncate text-sm leading-tight font-semibold"
                        title={selectedConversation.subject || "Support Conversation"}
                      >
                        {selectedConversation.subject || "Support Conversation"}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 pt-0">
                        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-medium">
                          <User className="h-2.5 w-2.5" />
                          <span title={selectedConversation.participants.find((p) => p.role === 0)?.name || "Unknown"}>
                            {selectedConversation.participants.find((p) => p.role === 0)?.name || "Unknown"}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Select
                      value={String(selectedConversation.status)}
                      onValueChange={(v) => {
                        const statusValue = parseInt(v, 10) as ConversationStatus;
                        updateConversationStatus(selectedConversation.id, statusValue);
                      }}
                    >
                      <SelectTrigger className="h-7 w-[90px] text-[11px] font-medium">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Active</SelectItem>
                        <SelectItem value="2">Resolved</SelectItem>
                        <SelectItem value="3">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={String(selectedConversation.priority)}
                      onValueChange={(v) => {
                        const priorityValue = parseInt(v, 10) as ConversationPriority;
                        updateConversationPriority(selectedConversation.id, priorityValue);
                      }}
                    >
                      <SelectTrigger className="h-7 w-[80px] text-[11px] font-medium">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Low</SelectItem>
                        <SelectItem value="1">Normal</SelectItem>
                        <SelectItem value="2">High</SelectItem>
                        <SelectItem value="3">Urgent</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Call buttons */}
                    <div className="ml-1.5 flex items-center gap-1 border-l pl-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleInitiateCall(CallType.Audio)}
                        disabled={connectionState !== "connected" || isInCall || selectedConversation.status === 3}
                        title={
                          connectionState !== "connected"
                            ? "Connect to chat to enable calls"
                            : isInCall
                              ? "Already in a call"
                              : selectedConversation.status === 3
                                ? "Cannot call closed conversations"
                                : "Start voice call"
                        }
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleInitiateCall(CallType.Video)}
                        disabled={connectionState !== "connected" || isInCall || selectedConversation.status === 3}
                        title={
                          connectionState !== "connected"
                            ? "Connect to chat to enable calls"
                            : isInCall
                              ? "Already in a call"
                              : selectedConversation.status === 3
                                ? "Cannot call closed conversations"
                                : "Start video call"
                        }
                      >
                        <Video className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                {lastError && (
                  <div className="bg-destructive/10 text-destructive border-destructive/20 mt-3 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
                    <WifiOff className="h-4 w-4 shrink-0" />
                    <span className="flex-1 font-medium">{lastError}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLastError(null)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/20 h-7 w-7 rounded-full p-0"
                    >
                      ×
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <ScrollArea className="min-h-0 flex-1 px-2 py-1">
                  {isLoadingMessages ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center">
                      <MessageSquare className="h-16 w-16" />
                      <p className="mt-4">No messages in this conversation.</p>
                      <p className="text-sm">The customer hasn&apos;t sent any messages yet.</p>
                    </div>
                  ) : (
                    <>
                      {groupedMessages.map((group) => (
                        <div key={group.date}>
                          <ChatDateSeparator date={group.date} />
                          {group.messages.map((message) =>
                            message.isCallMessage && message.callLogId ? (
                              <CallMessage
                                key={message.id}
                                content={message.content}
                                callLogId={message.callLogId}
                                senderName={message.senderName}
                                isCurrentUser={message.senderId === currentUserId}
                                createdAt={message.createdAt}
                                callType={message.callType}
                                callStatus={message.callStatus}
                                callDurationSeconds={message.callDurationSeconds}
                                callInitiatorId={message.callInitiatorId}
                                callInitiatorName={message.callInitiatorName}
                                onJoinCall={() => handleJoinActiveCall(message.callLogId!)}
                                onAnswerCall={() => handleJoinActiveCall(message.callLogId!)}
                                onDeclineCall={() => handleDeclineCall(message.callLogId!)}
                                canJoinCall={!isInCall && activeCallId === message.callLogId}
                                isRinging={
                                  !isInCall && activeCallId === message.callLogId && message.senderId !== currentUserId
                                }
                                isInCall={isInCall && currentCall?.callId === message.callLogId}
                              />
                            ) : (
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
                            ),
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </ScrollArea>

                <TypingIndicator users={typingUsers} />

                {selectedConversation.status === 3 ? (
                  <div className="bg-muted/30 shrink-0 border-t p-4">
                    <div className="text-muted-foreground flex items-center justify-center gap-2 py-2">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">This conversation has been closed</span>
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 border-t p-2">
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
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-12">
              <div className="bg-muted/50 rounded-full p-6">
                <MessageSquare className="h-12 w-12 opacity-40" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-foreground text-lg font-semibold">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to view and respond to messages</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Call Interface */}
      {isInCall && currentCall && (
        <CallInterface
          token={currentCall.token}
          serverUrl={currentCall.serverUrl}
          callType={currentCall.callType}
          onLeave={handleLeaveCall}
          participantName={auth.claims?.email || "Admin"}
        />
      )}

      {/* Incoming Call Notification */}
      {incomingCall && !isInCall && (
        <IncomingCallNotification
          callerName={incomingCall.initiatorName}
          callType={incomingCall.callType}
          onAnswer={() => handleAnswerCall(incomingCall.callId, incomingCall.callType)}
          onDecline={() => handleDeclineCall(incomingCall.callId)}
        />
      )}
    </main>
  );
}
