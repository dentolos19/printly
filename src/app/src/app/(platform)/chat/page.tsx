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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, MessageSquarePlus, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HUB_URL = `${API_URL}/hubs/conversation`;

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
          setMessages((prev) => [...prev, message]);
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
      if (!selectedConversationId || !connectionRef.current) return;
      try {
        await connectionRef.current.invoke("SendMessage", selectedConversationId, content, replyToMessageId || null);
      } catch (error) {
        console.error("[Chat] Failed to send message", error);
      }
    },
    [selectedConversationId],
  );

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("EditMessage", messageId, newContent);
    } catch (error) {
      console.error("[Chat] Failed to edit message", error);
    }
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("DeleteMessage", messageId);
    } catch (error) {
      console.error("[Chat] Failed to delete message", error);
    }
  }, []);

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

  return (
    <main className="flex h-full w-full p-4">
      <Card className="mx-auto flex h-full w-full max-w-6xl overflow-hidden">
        {/* Sidebar */}
        <div className="flex w-80 flex-col border-r">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3">
            <CardTitle className="text-lg">Messages</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  connectionState === "connected"
                    ? "default"
                    : connectionState === "connecting"
                      ? "secondary"
                      : "destructive"
                }
                className="gap-1"
              >
                {connectionState === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {connectionState === "connected"
                  ? "Online"
                  : connectionState === "connecting"
                    ? "Connecting"
                    : "Offline"}
              </Badge>
              <Button variant="ghost" size="icon" onClick={fetchConversations}>
                <RefreshCw className={cn("h-4 w-4", isLoadingConversations && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>

          <div className="p-2">
            <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <MessageSquarePlus className="h-4 w-4" />
                  Contact Support
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Support Conversation</DialogTitle>
                  <DialogDescription>
                    Describe your inquiry and our team will get back to you shortly.
                  </DialogDescription>
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

          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            isLoading={isLoadingConversations}
            emptyMessage="No conversations yet. Contact support to start one!"
          />
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedConversation.subject || "Conversation"}</CardTitle>
                    <p className="text-muted-foreground text-sm">Support Conversation</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                      <p>No messages yet.</p>
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

                <MessageInput
                  onSend={handleSendMessage}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                  disabled={connectionState !== "connected"}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                />
              </CardContent>
            </>
          ) : (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center">
              <MessageSquarePlus className="h-16 w-16" />
              <p className="mt-4 text-lg">Select a conversation or start a new one</p>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
