"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import * as signalR from "@microsoft/signalr";
import { Loader2, MessageCircle, RefreshCw, Send, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Participant {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: number;
  isCurrentUser: boolean;
}

interface LastMessagePreview {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  isRead: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  subject?: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: LastMessagePreview | null;
  participants: Participant[];
}

interface ConversationMessage {
  id: string;
  conversationId: string;
  participantId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  replyToMessageId?: string | null;
  replyToContent?: string | null;
  replyToSenderName?: string | null;
}

const HUB_URL = `${API_URL}/hubs/conversation`;

export default function StaffInbox() {
  const auth = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [filter, setFilter] = useState("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected" | "error">(
    "disconnected",
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const selectedConversationRef = useRef<string | null>(null);
  const currentUserId = auth.claims?.id ?? null;

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const authorizedFetch = useCallback(
    async (endpoint: string, init?: RequestInit) => {
      if (!auth.tokens?.accessToken) throw new Error("Missing access token");

      const headers: HeadersInit = {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${auth.tokens.accessToken}`,
      };

      const response = await fetch(endpoint, {
        ...init,
        headers,
      });
      return response;
    },
    [auth.tokens?.accessToken],
  );

  const fetchConversations = useCallback(async () => {
    if (!auth.tokens?.accessToken) return;
    setIsLoadingConversations(true);
    try {
      const response = await authorizedFetch(`${API_URL}/conversation?includeAllForStaff=true`);
      if (response.ok) {
        const data = (await response.json()) as ConversationSummary[];
        setConversations(data);
        if (!selectedConversationRef.current && data.length > 0) {
          setSelectedConversationId(data[0].id);
        }
      }
    } catch (error) {
      console.error("[Staff Inbox] Failed to fetch conversations", error);
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
          await markConversationRead(conversationId);
        }
      } catch (error) {
        console.error("[Staff Inbox] Failed to fetch messages", error);
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
        if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
          await connectionRef.current.invoke("MarkConversationRead", conversationId);
        } else {
          await authorizedFetch(`${API_URL}/conversation/${conversationId}/read`, { method: "POST" });
        }
        setConversations((prev) =>
          prev.map((conv) => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv)),
        );
      } catch (error) {
        console.error("[Staff Inbox] Failed to mark read", error);
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
    setConnectionError(null);

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
        .configureLogging(signalR.LogLevel.Information)
        .build();

      connection.onclose(() => setConnectionState("disconnected"));
      connection.onreconnecting(() => setConnectionState("connecting"));
      connection.onreconnected(async () => {
        setConnectionState("connected");
        const conversationId = selectedConversationRef.current;
        if (conversationId) {
          try {
            await connection.invoke("JoinConversation", conversationId);
          } catch (error) {
            console.error("[Staff Inbox] Failed to rejoin conversation", error);
          }
        }
      });

      connection.on("ConversationMessageReceived", (message: ConversationMessage) => {
        const currentConversationId = selectedConversationRef.current;
        setConversations((prev) => {
          const next = [...prev];
          const idx = next.findIndex((c) => c.id === message.conversationId);
          if (idx !== -1) {
            const conv = { ...next[idx] };
            conv.lastMessage = {
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              senderName: message.senderName,
              isRead: message.isRead,
              isDeleted: message.isDeleted,
              isEdited: message.isEdited,
              createdAt: message.createdAt,
            };
            if (
              currentUserId &&
              message.senderId !== currentUserId &&
              message.conversationId !== currentConversationId
            ) {
              conv.unreadCount = (conv.unreadCount ?? 0) + 1;
            }
            next.splice(idx, 1);
            next.unshift(conv);
          } else {
            fetchConversations();
          }
          return next;
        });

        if (currentConversationId === message.conversationId) {
          setMessages((prev) => [...prev, message]);
          if (currentUserId && message.senderId !== currentUserId) {
            markConversationRead(message.conversationId).catch(() => {});
          }
        }
      });

      connection.on(
        "ConversationMessagesRead",
        (data: { conversationId: string; messageIds: string[]; readAt: string }) => {
          if (selectedConversationRef.current !== data.conversationId) return;
          setMessages((prev) =>
            prev.map((m) => (data.messageIds.includes(m.id) ? { ...m, isRead: true, readAt: data.readAt } : m)),
          );
        },
      );

      connection.on(
        "ConversationMessageEdited",
        (data: { id: string; content: string; isEdited: boolean; editedAt: string }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.id ? { ...m, content: data.content, isEdited: data.isEdited, editedAt: data.editedAt } : m,
            ),
          );
        },
      );

      connection.on("ConversationMessageDeleted", (data: { id: string; isDeleted: boolean; deletedAt: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.id
              ? { ...m, content: "This message was deleted", isDeleted: data.isDeleted, deletedAt: data.deletedAt }
              : m,
          ),
        );
      });

      connection.on("ConversationUpdated", () => {
        fetchConversations();
      });

      await connection.start();
      connectionRef.current = connection;
      setConnectionState("connected");
      setConnectionError(null);
    } catch (error) {
      console.error("[Staff Inbox] Failed to connect", error);
      setConnectionState("error");
      setConnectionError(error instanceof Error ? error.message : "Connection failed");
    }
  }, [auth.tokens?.accessToken, currentUserId, markConversationRead, fetchConversations]);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      setSelectedConversationId(conversationId);
      if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
        try {
          await connectionRef.current.invoke("JoinConversation", conversationId);
        } catch (error) {
          console.error("[Staff Inbox] Failed to join conversation", error);
        }
      }
      await fetchMessages(conversationId);
      await markConversationRead(conversationId);
    },
    [fetchMessages, markConversationRead],
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !selectedConversationId || !connectionRef.current) return;
    if (connectionState !== "connected") return;

    const content = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    try {
      await connectionRef.current.invoke("SendMessage", selectedConversationId, content, null);
    } catch (error) {
      console.error("[Staff Inbox] Failed to send message", error);
      setInputMessage(content);
      setConnectionError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, selectedConversationId, connectionState]);

  useEffect(() => {
    if (!auth.tokens?.accessToken) return;
    fetchConversations();
    startConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {});
      }
    };
  }, [auth.tokens?.accessToken, fetchConversations, startConnection]);

  const filteredConversations = useMemo(() => {
    if (!filter) return conversations;
    const lower = filter.toLowerCase();
    return conversations.filter((conv) => getConversationTitle(conv, currentUserId).toLowerCase().includes(lower));
  }, [conversations, filter, currentUserId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (!auth.tokens) {
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Please log in to access the staff inbox.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid h-[720px] w-full grid-cols-1 gap-4 md:grid-cols-[360px_1fr]">
      <Card className="flex h-full flex-col">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <MessageCircle className="h-5 w-5" />
                All Conversations
              </CardTitle>
              {unreadCount > 0 && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-semibold">
                  {unreadCount}
                </span>
              )}
            </div>
            {renderConnectionStatus(connectionState, startConnection)}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search conversations"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={fetchConversations} disabled={isLoadingConversations}>
              <RefreshCw className={`h-4 w-4 ${isLoadingConversations ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {isLoadingConversations ? (
              <div className="text-muted-foreground flex items-center justify-center p-6 text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-muted-foreground p-6 text-sm">No conversations yet.</div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation) => {
                  const title = getConversationTitle(conversation, currentUserId);
                  const lastMessage = conversation.lastMessage?.content ?? "";
                  const hasUnread = conversation.unreadCount > 0;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`hover:bg-muted flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${selectedConversationId === conversation.id ? "bg-muted" : ""} ${hasUnread ? "font-semibold" : ""}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{title.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <div>{title}</div>
                          {hasUnread && (
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <div
                          className={`line-clamp-1 text-xs ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}
                        >
                          {lastMessage || "No messages yet"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageCircle className="h-5 w-5" />
              {selectedConversation
                ? getConversationTitle(selectedConversation, currentUserId)
                : "Select a conversation"}
            </CardTitle>
          </div>
          {connectionError ? (
            <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md px-3 py-2 text-sm">
              <WifiOff className="h-4 w-4" />
              <span className="flex-1 truncate">{connectionError}</span>
              <Button size="sm" variant="ghost" onClick={startConnection}>
                Retry
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {selectedConversation ? (
            <div className="flex h-full flex-col">
              <ScrollArea className="flex-1 px-4">
                {isLoadingMessages ? (
                  <div className="text-muted-foreground flex items-center justify-center p-6 text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-muted-foreground p-6 text-sm">No messages yet.</div>
                ) : (
                  <div className="space-y-3 pb-8">
                    {messages.map((message) => {
                      const fromMe = message.senderId === currentUserId;
                      return (
                        <div key={message.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm ${fromMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                          >
                            <div className="text-xs opacity-80">{fromMe ? "You" : message.senderName}</div>
                            <div className={`${message.isDeleted ? "italic opacity-70" : ""}`}>{message.content}</div>
                            <div className="mt-1 text-[11px] opacity-70">
                              {formatTime(message.createdAt)}
                              {message.isEdited ? " · edited" : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center">
              <MessageCircle className="h-10 w-10" />
              <p>Select a conversation to respond to customer inquiries.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-background border-t">
          <div className="flex w-full items-center gap-2">
            <Input
              placeholder={selectedConversation ? "Type your response..." : "Select a conversation to respond"}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={!selectedConversation || connectionState !== "connected"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!selectedConversation || isSending || connectionState !== "connected"}
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderConnectionStatus(state: "disconnected" | "connecting" | "connected" | "error", reconnect: () => void) {
  switch (state) {
    case "connected":
      return (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Wifi className="h-4 w-4" /> Connected
        </div>
      );
    case "connecting":
      return (
        <div className="flex items-center gap-1 text-xs text-yellow-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Connecting
        </div>
      );
    case "error":
      return (
        <button className="flex items-center gap-1 text-xs text-red-600" onClick={reconnect}>
          <WifiOff className="h-4 w-4" /> Retry
        </button>
      );
    default:
      return (
        <button className="text-muted-foreground flex items-center gap-1 text-xs" onClick={reconnect}>
          <WifiOff className="h-4 w-4" /> Connect
        </button>
      );
  }
}

function getConversationTitle(conversation: ConversationSummary, currentUserId: string | null) {
  if (conversation.subject) return conversation.subject;
  const others = conversation.participants.filter((p) => p.userId !== currentUserId);
  if (others.length === 0) return "Conversation";
  return others.map((p) => p.name).join(", ");
}
