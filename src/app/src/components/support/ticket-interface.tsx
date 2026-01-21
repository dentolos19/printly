"use client";

import { useAuth } from "@/lib/providers/auth";
import { API_URL } from "@/environment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as signalR from "@microsoft/signalr";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  WifiOff,
  Wifi,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Check,
  CheckCheck,
  Edit2,
  Trash2,
  Reply,
  X,
  Plus,
  MessageSquare,
  Clock,
} from "lucide-react";
import {
  type Ticket,
  type TicketMessage,
  TicketStatus,
  TicketPriority,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
} from "@/lib/server/ticket";

/** SignalR Hub URL for support */
const HUB_URL = `${API_URL}/hubs/support`;

/** SignalR response DTOs matching backend */
interface TicketMessageResponse {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  content: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  isReadByCustomer: boolean;
  isReadByAdmin: boolean;
  createdAt: string;
  replyToMessageId?: string;
  replyToContent?: string;
  replyToSenderName?: string;
}

interface MessageEditedResponse {
  messageId: string;
  ticketId: string;
  content: string;
  isEdited: boolean;
  editedAt: string;
}

interface MessageDeletedResponse {
  messageId: string;
  ticketId: string;
  isDeleted: boolean;
  deletedAt: string;
}

interface ReadReceiptResponse {
  ticketId: string;
  readerId: string;
  messageIds: string[];
  readAt: string;
}

interface StatusUpdatedResponse {
  ticketId: string;
  status: TicketStatus;
  updatedByUserId: string;
  updatedByUserName: string;
  updatedAt: string;
}

interface PriorityUpdatedResponse {
  ticketId: string;
  priority: TicketPriority;
  updatedByUserId: string;
  updatedByUserName: string;
  updatedAt: string;
}

interface TypingData {
  userId: string;
  userName: string;
  ticketId: string;
  isAdmin: boolean;
}

interface TicketInterfaceProps {
  /** If true, show admin controls (status, priority) */
  isAdmin?: boolean;
  /** Optional callback when a new ticket is created */
  onTicketCreated?: (ticket: Ticket) => void;
}

export default function TicketInterface({ isAdmin = false, onTicketCreated }: TicketInterfaceProps) {
  const auth = useAuth();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected" | "error">(
    "disconnected",
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingData>>(new Map());
  const [replyToMessage, setReplyToMessage] = useState<TicketMessage | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to track current values without triggering re-renders
  const selectedTicketRef = useRef<Ticket | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);

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

  /** Fetch tickets from backend */
  const fetchTickets = useCallback(async () => {
    if (!auth.tokens?.accessToken) return;

    setIsLoadingTickets(true);
    try {
      console.log("[Support] Fetching tickets from:", `${API_URL}/ticket`);
      const response = await fetch(`${API_URL}/ticket`, {
        headers: {
          Authorization: `Bearer ${auth.tokens.accessToken}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as Ticket[];
        if (isMountedRef.current) {
          setTickets(data);
          console.log(`[Support] Loaded ${data.length} tickets`);
        }
      } else {
        console.error("[Support] Failed to fetch tickets:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("[Support] Failed to fetch tickets:", error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingTickets(false);
      }
    }
  }, [auth.tokens?.accessToken]);

  /** Fetch messages for a ticket */
  const fetchMessages = useCallback(
    async (ticketId: string) => {
      if (!auth.tokens?.accessToken) return;

      try {
        console.log(`[Support] Loading messages for ticket: ${ticketId}`);
        const response = await fetch(`${API_URL}/ticket/${ticketId}/messages`, {
          headers: {
            Authorization: `Bearer ${auth.tokens.accessToken}`,
          },
        });

        if (response.ok) {
          const data = (await response.json()) as TicketMessage[];
          if (isMountedRef.current) {
            setMessages(data);
            console.log(`[Support] Loaded ${data.length} messages`);
            scrollToBottom();
          }
        } else {
          console.error("[Support] Failed to fetch messages:", response.status);
        }
      } catch (error) {
        console.error("[Support] Failed to fetch messages:", error);
      }
    },
    [auth.tokens?.accessToken, scrollToBottom],
  );

  /** Start SignalR connection */
  const startConnection = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("[Support] Connection already in progress, skipping...");
      return;
    }

    if (!auth.tokens?.accessToken) {
      console.log("[Support] No access token available");
      return;
    }

    isConnectingRef.current = true;

    // Stop existing connection if any
    if (connectionRef.current) {
      try {
        console.log("[Support] Stopping existing connection...");
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
      console.log(`[Support] Creating connection to: ${HUB_URL}`);

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => auth.tokens?.accessToken || "",
          skipNegotiation: false,
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.ServerSentEvents |
            signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            console.log(`[Support] Reconnect attempt ${retryContext.previousRetryCount + 1}`);
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

      console.log("[Support] Starting SignalR connection...");
      await connection.start();

      if (!isMountedRef.current) {
        // Component unmounted during connection
        await connection.stop();
        return;
      }

      console.log(`[Support] ✅ Connected successfully! Connection ID: ${connection.connectionId}`);

      setConnectionState("connected");
      setConnectionError(null);

      // Fetch tickets after connecting
      await fetchTickets();
    } catch (error) {
      console.error("[Support] ❌ Connection failed:", error);
      if (isMountedRef.current) {
        setConnectionState("error");
        setConnectionError(error instanceof Error ? error.message : "Connection failed");
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [auth.tokens?.accessToken, fetchTickets]);

  /** Setup SignalR event handlers */
  const setupConnectionHandlers = useCallback(
    (connection: signalR.HubConnection) => {
      // Handle incoming ticket messages
      connection.on("ReceiveTicketMessage", (message: TicketMessageResponse) => {
        console.log("[Support] Received ticket message:", message);
        const currentTicket = selectedTicketRef.current;

        // Only add message if it belongs to the currently viewed ticket
        if (message.ticketId === currentTicket?.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
          scrollToBottom();
        }

        // Update ticket list to reflect new message
        fetchTickets();
      });

      // Handle message edits
      connection.on("MessageEdited", (data: MessageEditedResponse) => {
        console.log("[Support] Message edited:", data);
        const currentTicket = selectedTicketRef.current;

        if (data.ticketId === currentTicket?.id && isMountedRef.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, content: data.content, isEdited: data.isEdited, editedAt: data.editedAt }
                : msg,
            ),
          );
        }
      });

      // Handle message deletes
      connection.on("MessageDeleted", (data: MessageDeletedResponse) => {
        console.log("[Support] Message deleted:", data);
        const currentTicket = selectedTicketRef.current;

        if (data.ticketId === currentTicket?.id && isMountedRef.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, content: "This message was deleted", isDeleted: data.isDeleted, deletedAt: data.deletedAt }
                : msg,
            ),
          );
        }
      });

      // Handle read receipts
      connection.on("TicketMessagesRead", (data: ReadReceiptResponse) => {
        console.log("[Support] Messages read:", data);
        const currentTicket = selectedTicketRef.current;
        const currentUserId = currentUserIdRef.current;

        if (data.ticketId === currentTicket?.id && isMountedRef.current) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (!data.messageIds.includes(msg.id)) return msg;
              // Determine who read based on whether reader is the customer
              const isCustomerReading = data.readerId === currentTicket.customerId;
              if (isCustomerReading) {
                return { ...msg, isReadByCustomer: true };
              } else {
                return { ...msg, isReadByAdmin: true };
              }
            }),
          );
          // Refresh ticket list to update unread counts
          fetchTickets();
        }
      });

      // Handle ticket status updates
      connection.on("TicketStatusUpdated", (data: StatusUpdatedResponse) => {
        console.log("[Support] Ticket status updated:", data);
        if (isMountedRef.current) {
          setTickets((prev) => prev.map((t) => (t.id === data.ticketId ? { ...t, status: data.status } : t)));
          // Update selected ticket if it's the one being updated
          if (selectedTicketRef.current?.id === data.ticketId) {
            setSelectedTicket((prev) => (prev ? { ...prev, status: data.status } : null));
          }
        }
      });

      // Handle ticket priority updates
      connection.on("TicketPriorityUpdated", (data: PriorityUpdatedResponse) => {
        console.log("[Support] Ticket priority updated:", data);
        if (isMountedRef.current) {
          setTickets((prev) => prev.map((t) => (t.id === data.ticketId ? { ...t, priority: data.priority } : t)));
          // Update selected ticket if it's the one being updated
          if (selectedTicketRef.current?.id === data.ticketId) {
            setSelectedTicket((prev) => (prev ? { ...prev, priority: data.priority } : null));
          }
        }
      });

      // Handle typing indicators
      connection.on("UserStartedTyping", (data: TypingData) => {
        console.log("[Support] User started typing:", data);
        const currentTicket = selectedTicketRef.current;
        if (data.ticketId === currentTicket?.id && isMountedRef.current) {
          setTypingUsers((prev) => new Map(prev).set(data.userId, data));
        }
      });

      connection.on("UserStoppedTyping", (data: { userId: string; ticketId: string }) => {
        console.log("[Support] User stopped typing:", data);
        const currentTicket = selectedTicketRef.current;
        if (data.ticketId === currentTicket?.id && isMountedRef.current) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
        }
      });

      // Handle hub errors
      connection.on("Error", (errorMessage: string) => {
        console.error("[Support] Hub error:", errorMessage);
        if (isMountedRef.current) {
          setConnectionError(errorMessage);
        }
      });

      // Handle reconnecting state
      connection.onreconnecting((error) => {
        console.log("[Support] Reconnecting...", error?.message);
        if (isMountedRef.current) {
          setConnectionState("connecting");
          setConnectionError(error?.message || "Reconnecting...");
        }
      });

      // Handle successful reconnection
      connection.onreconnected(async (connectionId) => {
        console.log(`[Support] ✅ Reconnected with ID: ${connectionId}`);
        if (isMountedRef.current) {
          setConnectionState("connected");
          setConnectionError(null);
          await fetchTickets();
        }
      });

      // Handle connection close
      connection.onclose((error) => {
        console.log("[Support] Connection closed:", error?.message);
        isConnectingRef.current = false;
        if (isMountedRef.current) {
          setConnectionState("disconnected");
          if (error) {
            setConnectionError(error.message);
          }
        }
      });
    },
    [scrollToBottom, fetchTickets],
  );

  /** Initialize SignalR connection */
  useEffect(() => {
    if (!auth.tokens?.accessToken) {
      return;
    }

    let isActive = true;

    const initialize = async () => {
      await fetchTickets();
      if (isActive) {
        await startConnection();
      }
    };

    initialize();

    return () => {
      isActive = false;
      if (connectionRef.current) {
        console.log("[Support] Cleaning up connection on unmount/token change");
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
      }
      isConnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.tokens?.accessToken]);

  /** Fetch messages when selected ticket changes */
  useEffect(() => {
    if (!selectedTicket?.id || !auth.tokens?.accessToken) {
      setMessages([]);
      return;
    }

    const abortController = new AbortController();

    const loadConversation = async () => {
      try {
        console.log(`[Support] Fetching messages for ticket ${selectedTicket.subject}`);
        const response = await fetch(`${API_URL}/ticket/${selectedTicket.id}/messages`, {
          headers: {
            Authorization: `Bearer ${auth.tokens?.accessToken}`,
            "Content-Type": "application/json",
          },
          signal: abortController.signal,
        });

        if (response.ok) {
          const conversation = (await response.json()) as TicketMessage[];
          if (!abortController.signal.aborted && isMountedRef.current) {
            console.log(`[Support] Loaded ${conversation.length} messages from database`);
            setMessages(conversation);

            // Mark messages as read when opening ticket
            if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
              try {
                await connectionRef.current.invoke("MarkTicketRead", selectedTicket.id);
                console.log("[Support] Marked messages as read");
                fetchTickets();
              } catch (err) {
                console.error("[Support] Failed to mark messages as read:", err);
              }
            }

            setTimeout(() => {
              scrollRef.current?.scrollIntoView({ behavior: "auto" });
            }, 100);
          }
        } else {
          console.error(`[Support] Failed to fetch messages: ${response.status}`);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[Support] Error fetching messages:", err);
        }
      }
    };

    setMessages([]);
    loadConversation();

    return () => {
      abortController.abort();
    };
  }, [selectedTicket?.id, auth.tokens?.accessToken, fetchTickets]);

  /** Create a new ticket */
  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !auth.tokens?.accessToken) return;

    setIsCreatingTicket(true);
    try {
      const response = await fetch(`${API_URL}/ticket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subject: newTicketSubject.trim(), orderId: null }),
      });

      if (response.ok) {
        const newTicket = (await response.json()) as Ticket;
        console.log("[Support] Created new ticket:", newTicket);
        setNewTicketSubject("");
        setShowNewTicketForm(false);
        await fetchTickets();
        setSelectedTicket(newTicket);
        onTicketCreated?.(newTicket);
      } else {
        console.error("[Support] Failed to create ticket:", response.status);
        setConnectionError("Failed to create ticket");
      }
    } catch (error) {
      console.error("[Support] Failed to create ticket:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to create ticket");
    } finally {
      setIsCreatingTicket(false);
    }
  };

  /** Send a message via SignalR */
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !connectionRef.current || connectionState !== "connected" || !selectedTicket) {
      return;
    }

    const messageContent = inputMessage.trim();
    const replyToId = replyToMessage?.id || null;

    setIsSending(true);
    setInputMessage("");
    setReplyToMessage(null);
    handleStopTyping();

    try {
      console.log(
        `[Support] Sending message to ticket: ${selectedTicket.id}${replyToId ? ` (reply to ${replyToId})` : ""}`,
      );
      await connectionRef.current.invoke("SendTicketMessage", selectedTicket.id, messageContent, replyToId);
      console.log("[Support] Message sent successfully");
    } catch (error) {
      console.error("[Support] Failed to send message:", error);
      setInputMessage(messageContent);
      setConnectionError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  /** Handle input change with typing indicator */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    if (!selectedTicket || !connectionRef.current || connectionState !== "connected") return;

    if (value.length > 0) {
      connectionRef.current.invoke("StartTypingInTicket", selectedTicket.id).catch(console.error);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping();
      }, 3000);
    } else {
      handleStopTyping();
    }
  };

  /** Stop typing indicator */
  const handleStopTyping = () => {
    if (!selectedTicket || !connectionRef.current || connectionState !== "connected") return;

    connectionRef.current.invoke("StopTypingInTicket", selectedTicket.id).catch(console.error);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  /** Handle Enter key press */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStopTyping();
      handleSendMessage();
    }
  };

  /** Edit a message */
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!connectionRef.current || connectionState !== "connected") return;

    try {
      await connectionRef.current.invoke("EditMessage", messageId, newContent);
      console.log("[Support] Message edited successfully");
    } catch (error) {
      console.error("[Support] Failed to edit message:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to edit message");
    }
  };

  /** Delete a message */
  const handleDeleteMessage = async (messageId: string) => {
    if (!connectionRef.current || connectionState !== "connected") return;

    try {
      await connectionRef.current.invoke("DeleteMessage", messageId);
      console.log("[Support] Message deleted successfully");
    } catch (error) {
      console.error("[Support] Failed to delete message:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to delete message");
    }
  };

  /** Update ticket status (admin only) */
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket || !connectionRef.current || connectionState !== "connected") return;

    try {
      await connectionRef.current.invoke("UpdateTicketStatus", selectedTicket.id, parseInt(newStatus));
      console.log("[Support] Ticket status updated successfully");
    } catch (error) {
      console.error("[Support] Failed to update ticket status:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  /** Update ticket priority (admin only) */
  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicket || !connectionRef.current || connectionState !== "connected") return;

    try {
      await connectionRef.current.invoke("UpdateTicketPriority", selectedTicket.id, parseInt(newPriority));
      console.log("[Support] Ticket priority updated successfully");
    } catch (error) {
      console.error("[Support] Failed to update ticket priority:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to update priority");
    }
  };

  /** Format timestamp for display */
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-SG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Singapore",
    });
  };

  /** Format date for ticket list */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return formatTime(dateString);
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-SG", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
    }
  };

  /** Get initials from name */
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
      <Card className="mx-auto w-full max-w-4xl">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Please log in to access support.</p>
        </CardContent>
      </Card>
    );
  }

  // Show ticket list if no ticket is selected
  if (!selectedTicket) {
    return (
      <Card className="mx-auto flex h-[600px] w-full max-w-4xl flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5" />
            {isAdmin ? "All Support Tickets" : "Your Support Tickets"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {renderConnectionStatus()}
            {!isAdmin && (
              <Button size="sm" onClick={() => setShowNewTicketForm(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New Ticket
              </Button>
            )}
          </div>
        </CardHeader>

        {renderErrorBanner()}

        {/* New Ticket Form */}
        {showNewTicketForm && (
          <div className="border-b px-4 pb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Describe your issue..."
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTicket();
                  if (e.key === "Escape") setShowNewTicketForm(false);
                }}
                disabled={isCreatingTicket}
                autoFocus
              />
              <Button onClick={handleCreateTicket} disabled={isCreatingTicket || !newTicketSubject.trim()}>
                {isCreatingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setShowNewTicketForm(false)} disabled={isCreatingTicket}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {isLoadingTickets ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-muted-foreground ml-2 text-sm">Loading tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  {isAdmin ? "No tickets yet." : "You haven't created any tickets yet."}
                </p>
                {!isAdmin && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowNewTicketForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Ticket
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="hover:bg-muted flex w-full items-center gap-3 p-4 text-left transition-colors"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{getInitials(ticket.customerName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{ticket.subject}</p>
                        {ticket.unreadCount > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {ticket.unreadCount > 9 ? "9+" : ticket.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {isAdmin && <span className="text-muted-foreground text-xs">{ticket.customerName}</span>}
                        <Badge variant="secondary" className={`text-[10px] ${getStatusColor(ticket.status)}`}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${getPriorityColor(ticket.priority)}`}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-muted-foreground flex shrink-0 flex-col items-end gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(ticket.lastMessageAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t p-3">
          <p className="text-muted-foreground w-full text-center text-xs">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </CardFooter>
      </Card>
    );
  }

  // Determine if current user is the customer for this ticket
  const isCustomer = selectedTicket.customerId === auth.claims?.id;

  // Get typing users for current ticket (excluding self)
  const currentTypingUsers = Array.from(typingUsers.values()).filter(
    (t) => t.ticketId === selectedTicket.id && t.userId !== auth.claims?.id,
  );

  // Show chat interface with selected ticket
  return (
    <Card className="mx-auto flex h-[600px] w-full max-w-4xl flex-col">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)} title="Back to tickets">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base font-semibold">{selectedTicket.subject}</CardTitle>
          <div className="mt-1 flex items-center gap-2">
            {isAdmin && <span className="text-muted-foreground text-xs">From: {selectedTicket.customerName}</span>}
            <Badge variant="secondary" className={`text-[10px] ${getStatusColor(selectedTicket.status)}`}>
              {getStatusLabel(selectedTicket.status)}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${getPriorityColor(selectedTicket.priority)}`}>
              {getPriorityLabel(selectedTicket.priority)}
            </Badge>
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Select value={selectedTicket.status.toString()} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Pending</SelectItem>
                <SelectItem value="1">Active</SelectItem>
                <SelectItem value="2">Resolved</SelectItem>
                <SelectItem value="3">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTicket.priority.toString()} onValueChange={handlePriorityChange}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Low</SelectItem>
                <SelectItem value="1">Normal</SelectItem>
                <SelectItem value="2">High</SelectItem>
                <SelectItem value="3">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

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
                const isRead = isCustomer ? message.isReadByAdmin : message.isReadByCustomer;

                return (
                  <TicketMessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={isOwnMessage}
                    isRead={isRead}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReply={() => setReplyToMessage(message)}
                    formatTime={formatTime}
                  />
                );
              })
            )}
            {/* Typing indicator */}
            {currentTypingUsers.length > 0 && (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-sm">
                <div className="flex gap-1">
                  <span className="bg-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
                  <span className="bg-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
                  <span className="bg-primary h-2 w-2 animate-bounce rounded-full" />
                </div>
                <span>
                  {currentTypingUsers[0].userName}
                  {currentTypingUsers.length > 1 ? ` and ${currentTypingUsers.length - 1} other(s)` : ""} is typing...
                </span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-col gap-0 border-t p-0">
        {/* Reply preview */}
        {replyToMessage && (
          <div className="bg-muted/50 flex w-full items-center gap-2 border-b px-3 py-2">
            <div className="border-primary min-w-0 flex-1 border-l-4 pl-2">
              <p className="text-primary truncate text-xs font-medium">Replying to {replyToMessage.senderName}</p>
              <p className="text-muted-foreground truncate text-sm">{replyToMessage.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setReplyToMessage(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex w-full gap-2 p-3">
          <Input
            placeholder={
              selectedTicket.status === TicketStatus.Closed
                ? "This ticket is closed"
                : connectionState === "connected"
                  ? "Type a message..."
                  : "Connecting..."
            }
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onBlur={handleStopTyping}
            disabled={connectionState !== "connected" || isSending || selectedTicket.status === TicketStatus.Closed}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            onClick={handleSendMessage}
            disabled={
              connectionState !== "connected" ||
              !inputMessage.trim() ||
              isSending ||
              selectedTicket.status === TicketStatus.Closed
            }
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

/** Message bubble component with edit/delete/reply support */
function TicketMessageBubble({
  message,
  isOwnMessage,
  isRead,
  onEdit,
  onDelete,
  onReply,
  formatTime,
}: {
  message: TicketMessage;
  isOwnMessage: boolean;
  isRead: boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: () => void;
  formatTime: (date: string) => string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(message.content);
  }, [message.content]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== message.content) {
      onEdit(message.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`group flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
      <div className="relative flex items-center gap-2">
        {/* Action buttons for own messages (left side) */}
        {isOwnMessage && !message.isDeleted && !isEditing && (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={onReply}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
              title="Reply"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
              title="Edit message"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(message.id)}
              className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
              title="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          className={`max-w-[75%] rounded-lg px-4 py-2 ${
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
          } ${message.isDeleted ? "italic opacity-60" : ""}`}
        >
          {/* Sender name for non-own messages */}
          {!isOwnMessage && <p className="mb-1 text-xs font-medium opacity-70">{message.senderName}</p>}

          {/* Reply context */}
          {message.replyToMessageId && message.replyToContent && (
            <div
              className={`mb-2 max-w-full overflow-hidden border-l-2 pl-2 text-xs ${isOwnMessage ? "border-primary-foreground/50 opacity-80" : "border-primary"}`}
            >
              <p className={`truncate font-medium ${isOwnMessage ? "" : "text-primary"}`}>
                {message.replyToSenderName || "Unknown"}
              </p>
              <p className="truncate opacity-80">{message.replyToContent}</p>
            </div>
          )}

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
                className="h-8 bg-white/20 text-sm"
              />
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="secondary" size="sm" className="h-6 px-2 text-xs" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm break-words">{message.content}</p>
          )}
        </div>

        {/* Reply button for other's messages (right side) */}
        {!isOwnMessage && !message.isDeleted && (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={onReply}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
              title="Reply"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Timestamp, edited indicator, and read receipt */}
      <div className="mt-1 flex items-center gap-1">
        {message.isEdited && !message.isDeleted && <span className="text-muted-foreground text-[10px]">edited</span>}
        <span className="text-muted-foreground text-xs">{formatTime(message.createdAt)}</span>
        {isOwnMessage && (
          <span className="ml-0.5">
            {isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Check className="text-muted-foreground h-3.5 w-3.5" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
