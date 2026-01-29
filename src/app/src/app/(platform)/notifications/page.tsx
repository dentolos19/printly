"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import { getNotificationIcon, type RealTimeNotification } from "@/lib/server/notification";
import * as signalR from "@microsoft/signalr";
import { Archive, ArchiveIcon, Bell, CheckCheck, Inbox, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  conversationId?: string;
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  priority: string;
  actionUrl?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { tokens, isInitialized } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const fetchNotifications = useCallback(
    async (includeArchived = false) => {
      if (!tokens?.accessToken) return;

      console.log("[NOTIFICATION DEBUG] fetchNotifications called, includeArchived:", includeArchived);

      try {
        const response = await fetch(`${API_URL}/notification?includeArchived=${includeArchived}&limit=100`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });

        console.log("[NOTIFICATION DEBUG] API response status:", response.status);

        if (response.ok) {
          const data: Notification[] = await response.json();
          console.log("[NOTIFICATION DEBUG] Received notifications:", data.length, data);
          if (includeArchived) {
            setArchivedNotifications(data.filter((n: Notification) => n.isArchived));
          } else {
            setNotifications(data.filter((n: Notification) => !n.isArchived));
          }
        } else {
          console.error("[NOTIFICATION DEBUG] API error response:", await response.text());
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    },
    [tokens?.accessToken],
  );

  const markAsRead = async (id: string) => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/${id}/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/mark-all-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const archiveNotification = async (id: string) => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/${id}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetchNotifications(true);
    } catch (error) {
      console.error("Failed to archive:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!tokens?.accessToken) return;

    try {
      await fetch(`${API_URL}/notification/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setArchivedNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const deleteAll = async () => {
    if (!tokens?.accessToken) return;
    if (!confirm("Delete all notifications? This cannot be undone.")) return;

    try {
      await fetch(`${API_URL}/notification/all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      setNotifications([]);
      setArchivedNotifications([]);
    } catch (error) {
      console.error("Failed to delete all:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  // Initial load and polling for new notifications (every 30 seconds as backup)
  useEffect(() => {
    fetchNotifications(false);
    fetchNotifications(true);

    const pollInterval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [fetchNotifications]);

  // Real-time notifications via SignalR
  useEffect(() => {
    if (!isInitialized || !tokens?.accessToken) return;
    if (connectionRef.current) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/conversation`, {
        accessTokenFactory: () => tokens.accessToken,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on("ReceiveNotification", (notification: RealTimeNotification) => {
      const formattedNotification: Notification = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        conversationId: notification.conversationId ?? undefined,
        isRead: false,
        isArchived: false,
        priority: notification.priority || "Normal",
        actionUrl: notification.actionUrl ?? undefined,
        createdAt: notification.createdAt,
      };

      setNotifications((prev) => [formattedNotification, ...prev]);
    });

    connection
      .start()
      .then(() => {
        connectionRef.current = connection;
      })
      .catch((err) => {
        console.error("[Notifications] SignalR connection error:", err);
      });

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [isInitialized, tokens?.accessToken]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchNotifications(false), fetchNotifications(true)]);
    setIsRefreshing(false);
  };

  const renderNotification = (notification: Notification, showArchive = true) => (
    <div
      key={notification.id}
      className={`hover:bg-accent cursor-pointer rounded-lg border p-4 transition-colors ${
        !notification.isRead ? "border-blue-200 bg-blue-50 dark:bg-blue-950" : ""
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-3xl">{getNotificationIcon(notification.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{notification.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">{notification.message}</p>
              <p className="text-muted-foreground mt-2 text-xs">{formatTime(notification.createdAt)}</p>
            </div>
            {!notification.isRead && (
              <Badge variant="default" className="flex-shrink-0">
                New
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {showArchive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                archiveNotification(notification.id);
              }}
            >
              <Archive className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              deleteNotification(notification.id);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notifications
              {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
                <RefreshCw className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button onClick={markAllAsRead} variant="outline" size="sm">
                  <CheckCheck className="mr-2 size-4" />
                  Mark all read
                </Button>
              )}
              <Button onClick={deleteAll} variant="outline" size="sm">
                <Trash2 className="mr-2 size-4" />
                Delete all
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">
                <Inbox className="mr-2 size-4" />
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                <ArchiveIcon className="mr-2 size-4" />
                Archived ({archivedNotifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
                      <Bell className="mb-4 size-16 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => renderNotification(notification, true))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="archived" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {archivedNotifications.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
                      <ArchiveIcon className="mb-4 size-16 opacity-50" />
                      <p>No archived notifications</p>
                    </div>
                  ) : (
                    archivedNotifications.map((notification) => renderNotification(notification, false))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
