"use client";

import { useAuth } from "@/lib/providers/auth";
import { API_URL } from "@/environment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import * as signalR from "@microsoft/signalr";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, WifiOff, Wifi, ArrowLeft, Users, RefreshCw, Circle, AlertCircle } from "lucide-react";

/** Message response type matching the backend DTO */
interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  createdAt: string;
}

/** User response for contacts list */
interface User {
  id: string;
  name: string;
  email: string;
}

/** SignalR Hub URL - uses API_URL from environment */
const HUB_URL = `${API_URL}/hubs/chat`;

export default function ChatInterface() {
  const auth = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected" | "error">(
    "disconnected",
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Use refs to track current values without triggering re-renders
  const selectedUserRef = useRef<User | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    currentUserIdRef.current = auth.claims?.id ?? null;
  }, [auth.claims?.id]);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** Scroll to the bottom of the message list */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  /** Fetch available users to chat with */
  const fetchUsers = useCallback(async () => {
    if (!auth.tokens?.accessToken) return;

    setIsLoadingUsers(true);
    try {
      console.log("[Chat] Fetching users from:", `${API_URL}/message/users`);
      const response = await fetch(`${API_URL}/message/users`, {
        headers: {
          Authorization: `Bearer ${auth.tokens.accessToken}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as User[];
        if (isMountedRef.current) {
          setUsers(data);
          console.log(`[Chat] Loaded ${data.length} users`);
        }
      } else {
        console.error("[Chat] Failed to fetch users:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("[Chat] Failed to fetch users:", error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingUsers(false);
      }
    }
  }, [auth.tokens?.accessToken]);

  /** Fetch message history with selected user */
  const fetchMessages = useCallback(
    async (userId: string) => {
      if (!auth.tokens?.accessToken) return;

      try {
        console.log(`[Chat] Loading conversation with user: ${userId}`);
        const response = await fetch(`${API_URL}/message/${userId}`, {
          headers: {
            Authorization: `Bearer ${auth.tokens.accessToken}`,
          },
        });

        if (response.ok) {
          const data = (await response.json()) as Message[];
          if (isMountedRef.current) {
            setMessages(data);
            console.log(`[Chat] Loaded ${data.length} messages`);
            scrollToBottom();
          }
        } else {
          console.error("[Chat] Failed to fetch messages:", response.status);
        }
      } catch (error) {
        console.error("[Chat] Failed to fetch messages:", error);
      }
    },
    [auth.tokens?.accessToken, scrollToBottom],
  );

  /** Fetch online users from the hub */
  const fetchOnlineUsers = useCallback(async (connection: signalR.HubConnection) => {
    try {
      const onlineUserIds = (await connection.invoke("GetOnlineUsers")) as string[];
      console.log("[Chat] Online users:", onlineUserIds);
      if (isMountedRef.current) {
        setOnlineUsers(new Set(onlineUserIds));
      }
    } catch (error) {
      console.error("[Chat] Failed to get online users:", error);
    }
  }, []);

  /** Start SignalR connection */
  const startConnection = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("[Chat] Connection already in progress, skipping...");
      return;
    }

    if (!auth.tokens?.accessToken) {
      console.log("[Chat] No access token available");
      return;
    }

    isConnectingRef.current = true;

    // Stop existing connection if any
    if (connectionRef.current) {
      try {
        console.log("[Chat] Stopping existing connection...");
        await connectionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      connectionRef.current = null;
    }

    if (isMountedRef.current) {
      setConnectionState("connecting");
      setConnectionError(null);
    }

    try {
      console.log(`[Chat] Creating connection to: ${HUB_URL}`);

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => auth.tokens?.accessToken || "",
          // Let SignalR negotiate the best transport
          skipNegotiation: false,
          // Support multiple transports with fallback
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.ServerSentEvents |
            signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0s, 2s, 5s, 10s, 30s, then 60s max
            console.log(`[Chat] Reconnect attempt ${retryContext.previousRetryCount + 1}`);
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 5000;
            if (retryContext.previousRetryCount === 3) return 10000;
            if (retryContext.previousRetryCount === 4) return 30000;
            return 60000;
          },
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      connectionRef.current = connection;

      // Setup event handlers BEFORE starting connection
      setupConnectionHandlers(connection);

      console.log("[Chat] Starting SignalR connection...");
      await connection.start();

      if (!isMountedRef.current) {
        // Component unmounted during connection
        await connection.stop();
        return;
      }

      console.log(`[Chat] ✅ Connected successfully! Connection ID: ${connection.connectionId}`);

      setConnectionState("connected");
      setConnectionError(null);

      // Get initial online users and fetch user list
      await fetchOnlineUsers(connection);
      await fetchUsers();
    } catch (error) {
      console.error("[Chat] ❌ Connection failed:", error);
      if (isMountedRef.current) {
        setConnectionState("error");
        setConnectionError(error instanceof Error ? error.message : "Connection failed");
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [auth.tokens?.accessToken, fetchOnlineUsers, fetchUsers]);

  /** Setup SignalR event handlers */
  const setupConnectionHandlers = useCallback(
    (connection: signalR.HubConnection) => {
      // Handle incoming messages
      connection.on("ReceiveMessage", (message: Message) => {
        console.log("[Chat] Received message:", message);
        const currentUserId = currentUserIdRef.current;
        const currentSelectedUser = selectedUserRef.current;

        // Only add message if it belongs to the current conversation
        const isFromSelectedUser = message.senderId === currentSelectedUser?.id;
        const isToSelectedUser = message.receiverId === currentSelectedUser?.id;
        const isFromMe = message.senderId === currentUserId;
        const isToMe = message.receiverId === currentUserId;

        // Show message if it's part of the currently viewed conversation
        if ((isFromSelectedUser && isToMe) || (isFromMe && isToSelectedUser)) {
          setMessages((prev) => {
            // Prevent duplicate messages
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
          scrollToBottom();
        }
      });

      // Handle user online status
      connection.on("UserOnline", (userId: string) => {
        console.log("[Chat] User online:", userId);
        if (isMountedRef.current) {
          setOnlineUsers((prev) => new Set(prev).add(userId));
        }
      });

      // Handle user offline status
      connection.on("UserOffline", (userId: string) => {
        console.log("[Chat] User offline:", userId);
        if (isMountedRef.current) {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }
      });

      // Handle hub errors
      connection.on("Error", (errorMessage: string) => {
        console.error("[Chat] Hub error:", errorMessage);
        if (isMountedRef.current) {
          setConnectionError(errorMessage);
        }
      });

      // Handle reconnecting state
      connection.onreconnecting((error) => {
        console.log("[Chat] Reconnecting...", error?.message);
        if (isMountedRef.current) {
          setConnectionState("connecting");
          setConnectionError(error?.message || "Reconnecting...");
        }
      });

      // Handle successful reconnection
      connection.onreconnected(async (connectionId) => {
        console.log(`[Chat] ✅ Reconnected with ID: ${connectionId}`);
        if (isMountedRef.current) {
          setConnectionState("connected");
          setConnectionError(null);
          // Re-fetch online users after reconnection
          await fetchOnlineUsers(connection);
          await fetchUsers();
        }
      });

      // Handle connection close
      connection.onclose((error) => {
        console.log("[Chat] Connection closed:", error?.message);
        isConnectingRef.current = false;
        if (isMountedRef.current) {
          setConnectionState("disconnected");
          if (error) {
            setConnectionError(error.message);
          }
        }
      });
    },
    [scrollToBottom, fetchOnlineUsers, fetchUsers],
  );

  /** Initialize SignalR connection */
  useEffect(() => {
    if (!auth.tokens?.accessToken) {
      return;
    }

    // Track if this effect is still active
    let isActive = true;

    const initialize = async () => {
      // Fetch users first (even without connection for initial list)
      await fetchUsers();

      // Then start SignalR connection only if still active
      if (isActive) {
        await startConnection();
      }
    };

    initialize();

    // Cleanup on unmount or token change
    return () => {
      isActive = false;
      if (connectionRef.current) {
        console.log("[Chat] Cleaning up connection on unmount/token change");
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
      }
      isConnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.tokens?.accessToken]); // Only depend on token, not on functions

  /** Fetch messages when selected user changes */
  useEffect(() => {
    if (!selectedUser?.id || !auth.tokens?.accessToken) {
      setMessages([]); // Clear messages when no user selected
      return;
    }

    // Create an abort controller for cleanup
    const abortController = new AbortController();

    const loadConversation = async () => {
      try {
        console.log(`[Chat] Fetching conversation with ${selectedUser.email}`);
        const response = await fetch(`${API_URL}/message/${selectedUser.id}`, {
          headers: {
            Authorization: `Bearer ${auth.tokens?.accessToken}`,
            "Content-Type": "application/json",
          },
          signal: abortController.signal,
        });

        if (response.ok) {
          const conversation = (await response.json()) as Message[];
          if (!abortController.signal.aborted && isMountedRef.current) {
            console.log(`[Chat] Loaded ${conversation.length} messages from database`);
            setMessages(conversation);
            setTimeout(() => {
              scrollRef.current?.scrollIntoView({ behavior: "auto" });
            }, 100);
          }
        } else {
          console.error(`[Chat] Failed to fetch conversation: ${response.status}`);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[Chat] Error fetching conversation:", err);
        }
      }
    };

    // Clear old messages and load new conversation
    setMessages([]);
    loadConversation();

    return () => {
      abortController.abort();
    };
  }, [selectedUser?.id, auth.tokens?.accessToken]); // Only re-run when user ID or token changes

  /** Send a message via SignalR */
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !connectionRef.current || connectionState !== "connected" || !selectedUser) {
      return;
    }

    const messageContent = inputMessage.trim();
    setIsSending(true);
    setInputMessage(""); // Clear input immediately for better UX

    try {
      console.log(`[Chat] Sending message to: ${selectedUser.id}`);
      await connectionRef.current.invoke("SendMessage", selectedUser.id, messageContent);
      console.log("[Chat] Message sent successfully");
    } catch (error) {
      console.error("[Chat] Failed to send message:", error);
      // Restore the message on error
      setInputMessage(messageContent);
      setConnectionError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  /** Handle Enter key press */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /** Format timestamp for display */
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /** Get initials from name or email */
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  /** Render connection status indicator */
  const renderConnectionStatus = () => {
    switch (connectionState) {
      case "connecting":
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
            <span className="text-xs text-yellow-500">Connecting...</span>
          </div>
        );
      case "connected":
        return (
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-500">Connected</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-xs text-red-500">Error</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startConnection} title="Retry connection">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400">Disconnected</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startConnection} title="Connect">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        );
    }
  };

  /** Render error banner */
  const renderErrorBanner = () => {
    if (!connectionError) return null;

    return (
      <div className="bg-destructive/10 text-destructive mx-4 mb-2 flex items-center gap-2 rounded-md p-2 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{connectionError}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            setConnectionError(null);
            startConnection();
          }}
        >
          Retry
        </Button>
      </div>
    );
  };

  // Show login prompt if not authenticated
  if (!auth.tokens) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Please log in to use the chat.</p>
        </CardContent>
      </Card>
    );
  }

  // Show user list if no user is selected
  if (!selectedUser) {
    return (
      <Card className="mx-auto flex h-[600px] w-full max-w-2xl flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Select a User to Chat
          </CardTitle>
          {renderConnectionStatus()}
        </CardHeader>

        {renderErrorBanner()}

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-muted-foreground ml-2 text-sm">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">No other users available to chat with.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={fetchUsers}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Users
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {users.map((user) => {
                  const isOnline = onlineUsers.has(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="hover:bg-muted flex w-full items-center gap-3 p-4 text-left transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
                        </Avatar>
                        <Circle
                          className={`absolute right-0 bottom-0 h-3 w-3 ${
                            isOnline ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium">{user.name || user.email.split("@")[0]}</p>
                        <p className="text-muted-foreground truncate text-sm">
                          {isOnline ? <span className="text-green-600">Online</span> : user.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t p-3">
          <p className="text-muted-foreground w-full text-center text-xs">
            {users.length} user{users.length !== 1 ? "s" : ""} • {onlineUsers.size} online
          </p>
        </CardFooter>
      </Card>
    );
  }

  // Show chat interface with selected user
  const isSelectedUserOnline = onlineUsers.has(selectedUser.id);

  return (
    <Card className="mx-auto flex h-[600px] w-full max-w-2xl flex-col">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} title="Back to user list">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{getInitials(selectedUser.name || selectedUser.email)}</AvatarFallback>
          </Avatar>
          <Circle
            className={`absolute right-0 bottom-0 h-2.5 w-2.5 ${
              isSelectedUserOnline ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base font-semibold">
            {selectedUser.name || selectedUser.email.split("@")[0]}
          </CardTitle>
          <p className="text-xs">
            {isSelectedUserOnline ? (
              <span className="text-green-600">Online</span>
            ) : (
              <span className="text-muted-foreground">{selectedUser.email}</span>
            )}
          </p>
        </div>
        {renderConnectionStatus()}
      </CardHeader>

      {renderErrorBanner()}

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Send a message to start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === auth.claims?.id;

                return (
                  <div key={message.id} className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 ${
                        isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                    </div>
                    <span className="text-muted-foreground mt-1 text-xs">{formatTime(message.createdAt)}</span>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-3">
        <div className="flex w-full gap-2">
          <Input
            placeholder={connectionState === "connected" ? "Type a message..." : "Connecting..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={connectionState !== "connected" || isSending}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            onClick={handleSendMessage}
            disabled={connectionState !== "connected" || !inputMessage.trim() || isSending}
            size="icon"
            title="Send message"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
