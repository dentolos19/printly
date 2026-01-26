"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import * as signalR from "@microsoft/signalr";
import { ArrowLeft, Circle, Loader2, Send, Users, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  unreadCount: number;
}

const HUB_URL = `${API_URL}/hubs/chat`;

export default function ChatInterface() {
  const auth = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!auth.tokens?.accessToken) return;

    try {
      const response = await fetch(`${API_URL}/message/users`, {
        headers: { Authorization: `Bearer ${auth.tokens.accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data as User[]);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [auth.tokens?.accessToken]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!auth.tokens?.accessToken || !selectedUser) return;

    try {
      const response = await fetch(`${API_URL}/message/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${auth.tokens.accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data as Message[]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [auth.tokens?.accessToken, selectedUser]);

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !connectionRef.current || !selectedUser) return;

    try {
      await connectionRef.current.invoke("SendMessage", selectedUser.id, inputMessage.trim(), null);
      setInputMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message");
    }
  };

  // Connect to SignalR
  useEffect(() => {
    if (!auth.tokens?.accessToken) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => auth.tokens?.accessToken || "",
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    connection.on("UserOnline", (userId: string) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    connection.on("UserOffline", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    connection
      .start()
      .then(() => {
        setConnectionState("connected");
        fetchUsers();
      })
      .catch(() => setConnectionState("disconnected"));

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [auth.tokens?.accessToken, fetchUsers]);

  // Fetch messages when user selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedUser, fetchMessages]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Show user list
  if (!selectedUser) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Conversations
          </CardTitle>
        </CardHeader>

        <CardContent>
          {connectionState === "connecting" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {connectionState === "disconnected" && (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <WifiOff className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">Connecting...</p>
            </div>
          )}

          {connectionState === "connected" && (
            <ScrollArea className="h-[400px]">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">No users available</div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => {
                    const isOnline = onlineUsers.has(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-100"
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
                          </Avatar>
                          <Circle
                            className={`absolute right-0 bottom-0 h-3 w-3 ${
                              isOnline ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{user.name || user.email.split("@")[0]}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        {user.unreadCount > 0 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                            {user.unreadCount}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>

        <CardFooter className="border-t p-3">
          <div className="flex w-full items-center justify-between text-xs text-gray-500">
            <span>
              {users.length} user{users.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              {connectionState === "connected" ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </span>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // Show chat with selected user
  return (
    <Card className="mx-auto flex h-[600px] w-full max-w-2xl flex-col">
      <CardHeader className="flex flex-row items-center gap-3 border-b pb-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar>
          <AvatarFallback>{getInitials(selectedUser.name || selectedUser.email)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-base">{selectedUser.name || selectedUser.email.split("@")[0]}</CardTitle>
          <p className="text-xs text-gray-500">{selectedUser.email}</p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((message) => {
                const isMe = message.senderId === auth.claims?.id;
                return (
                  <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${isMe ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs ${isMe ? "text-blue-100" : "text-gray-500"}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={connectionState !== "connected"}
          />
          <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || connectionState !== "connected"}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
