"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/providers/auth";
import { API_URL } from "@/environment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Trash2, CheckCheck, Bell, Inbox, ArchiveIcon } from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function NotificationsPage() {
  const { tokens } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  const fetchNotifications = useCallback(
    async (includeArchived = false) => {
      if (!tokens?.accessToken) return;

      try {
        const response = await fetch(`${API_URL}/notification?includeArchived=${includeArchived}&limit=100`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });

        if (response.ok) {
          const data: Notification[] = await response.json();
          if (includeArchived) {
            setArchivedNotifications(data.filter((n: Notification) => n.isArchived));
          } else {
            setNotifications(data.filter((n: Notification) => !n.isArchived));
          }
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

  useEffect(() => {
    fetchNotifications(false);
    fetchNotifications(true);
  }, [fetchNotifications]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
