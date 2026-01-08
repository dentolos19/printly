"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import * as signalR from "@microsoft/signalr";
import { Archive, Bell, CheckCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ComponentProps, useCallback, useEffect, useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  ticketId?: string;
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  priority: string;
  actionUrl?: string;
  createdAt: string;
}

export function NotificationBell(props: ComponentProps<typeof Button>) {
  const { tokens } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!tokens?.accessToken) return;

    try {
      const response = await fetch(`${API_URL}/notification?limit=10`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (response.ok) {
        const data: Notification[] = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [tokens?.accessToken]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!tokens?.accessToken) return;

    try {
      const response = await fetch(`${API_URL}/notification/unread-count`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (response.ok) {
        const count: number = await response.json();
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [tokens?.accessToken]);

  // Mark as read
  const markAsRead = async (id: string) => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/${id}/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/mark-all-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Archive notification
  const archiveNotification = async (id: string) => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/${id}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetchUnreadCount();
    } catch (error) {
      console.error("Failed to archive:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetchUnreadCount();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setIsOpen(false);
    }
  };

  // Setup SignalR for real-time notifications
  useEffect(() => {
    if (!tokens?.accessToken) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/support`, {
        accessTokenFactory: () => tokens.accessToken,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", (notification: Notification) => {
      console.log("New notification:", notification);

      // Add to list
      setNotifications((prev) => [notification, ...prev].slice(0, 10));
      setUnreadCount((prev) => prev + 1);

      // Play notification sound
      try {
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {
          // Silently fail if autoplay is blocked
        });
      } catch (error) {
        console.error("Failed to play sound:", error);
      }

      // Show browser notification if document is hidden
      if (document.hidden && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/logo.png",
        });
      }
    });

    connection.start().catch((err) => console.error("SignalR error:", err));

    return () => {
      connection.stop();
    };
  }, [tokens?.accessToken]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Request browser notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [fetchNotifications, fetchUnreadCount]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TicketCreated":
        return "🎫";
      case "NewMessage":
        return "💬";
      case "TicketStatusChanged":
        return "🔄";
      case "TicketClosed":
        return "✅";
      case "BroadcastSent":
        return "📢";
      default:
        return "🔔";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" {...props}>
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
              <CheckCheck className="mr-1 size-4" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
              <Bell className="mb-2 size-12 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`hover:bg-accent cursor-pointer p-4 transition-colors ${
                    !notification.isRead ? "bg-blue-50 dark:bg-blue-950" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {!notification.isRead && <div className="mt-1 size-2 flex-shrink-0 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{notification.message}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{formatTime(notification.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveNotification(notification.id);
                        }}
                      >
                        <Archive className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              router.push("/notifications");
              setIsOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
