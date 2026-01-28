import { ServerFetch } from "@/types";

// Notification types matching backend enum
export enum NotificationType {
  ConversationCreated = 0,
  ConversationAssigned = 1,
  ConversationStatusChanged = 2,
  ConversationPriorityChanged = 3,
  NewMessage = 4,
  ConversationClosed = 5,
  MentionedInMessage = 6,
  AdminJoinedConversation = 7,
  BroadcastSent = 8,
}

// Notification priority matching backend enum
export enum NotificationPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3,
}

// String mappings for display
export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.ConversationCreated]: "Conversation Created",
  [NotificationType.ConversationAssigned]: "Conversation Assigned",
  [NotificationType.ConversationStatusChanged]: "Status Changed",
  [NotificationType.ConversationPriorityChanged]: "Priority Changed",
  [NotificationType.NewMessage]: "New Message",
  [NotificationType.ConversationClosed]: "Conversation Closed",
  [NotificationType.MentionedInMessage]: "You Were Mentioned",
  [NotificationType.AdminJoinedConversation]: "Admin Joined",
  [NotificationType.BroadcastSent]: "Broadcast",
};

export const NotificationPriorityLabels: Record<NotificationPriority, string> = {
  [NotificationPriority.Low]: "Low",
  [NotificationPriority.Normal]: "Normal",
  [NotificationPriority.High]: "High",
  [NotificationPriority.Urgent]: "Urgent",
};

// Icons for each notification type
export const NotificationTypeIcons: Record<NotificationType, string> = {
  [NotificationType.ConversationCreated]: "🎫",
  [NotificationType.ConversationAssigned]: "👤",
  [NotificationType.ConversationStatusChanged]: "🔄",
  [NotificationType.ConversationPriorityChanged]: "⚡",
  [NotificationType.NewMessage]: "💬",
  [NotificationType.ConversationClosed]: "✅",
  [NotificationType.MentionedInMessage]: "📣",
  [NotificationType.AdminJoinedConversation]: "👋",
  [NotificationType.BroadcastSent]: "📢",
};

// Helper to get icon from type (handles both number and string types)
export function getNotificationIcon(type: NotificationType | string | number): string {
  // If it's a string (from backend JSON), parse the enum
  if (typeof type === "string") {
    const typeKey = type as keyof typeof NotificationType;
    const enumValue = NotificationType[typeKey];
    if (typeof enumValue === "number") {
      return NotificationTypeIcons[enumValue] || "🔔";
    }
    return "🔔";
  }
  // If it's a number, use directly
  return NotificationTypeIcons[type as NotificationType] || "🔔";
}

// Notification response from API
export type NotificationResponse = {
  id: string;
  type: NotificationType | string; // Backend returns string representation
  title: string;
  message: string;
  conversationId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  isArchived: boolean;
  priority: NotificationPriority | string;
  actionUrl?: string | null;
  createdAt: string;
};

// Real-time notification from SignalR (may have slightly different format)
export type RealTimeNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  conversationId?: string | null;
  priority: string;
  actionUrl?: string | null;
  createdAt: string;
  isRead?: boolean;
  isArchived?: boolean;
};

// Query parameters for fetching notifications
export type NotificationQueryParams = {
  isRead?: boolean;
  includeArchived?: boolean;
  limit?: number;
};

// API functions
export async function getNotifications(
  serverFetch: ServerFetch,
  params?: NotificationQueryParams,
): Promise<NotificationResponse[]> {
  const searchParams = new URLSearchParams();
  if (params?.isRead !== undefined) searchParams.set("isRead", String(params.isRead));
  if (params?.includeArchived !== undefined) searchParams.set("includeArchived", String(params.includeArchived));
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  const url = `/notification${queryString ? `?${queryString}` : ""}`;

  const response = await serverFetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return response.json();
}

export async function getUnreadCount(serverFetch: ServerFetch): Promise<number> {
  const response = await serverFetch("/notification/unread-count");
  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }
  return response.json();
}

export async function getArchivedNotifications(
  serverFetch: ServerFetch,
  limit?: number,
): Promise<NotificationResponse[]> {
  const url = `/notification/archived${limit ? `?limit=${limit}` : ""}`;
  const response = await serverFetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch archived notifications");
  }
  return response.json();
}

export async function markAsRead(serverFetch: ServerFetch, id: string): Promise<void> {
  const response = await serverFetch(`/notification/${id}/mark-read`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }
}

export async function markAllAsRead(serverFetch: ServerFetch): Promise<{ count: number }> {
  const response = await serverFetch("/notification/mark-all-read", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }
  return response.json();
}

export async function archiveNotification(serverFetch: ServerFetch, id: string): Promise<void> {
  const response = await serverFetch(`/notification/${id}/archive`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to archive notification");
  }
}

export async function unarchiveNotification(serverFetch: ServerFetch, id: string): Promise<void> {
  const response = await serverFetch(`/notification/${id}/unarchive`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to unarchive notification");
  }
}

export async function deleteNotification(serverFetch: ServerFetch, id: string): Promise<void> {
  const response = await serverFetch(`/notification/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete notification");
  }
}

export async function deleteAllNotifications(serverFetch: ServerFetch): Promise<{ count: number }> {
  const response = await serverFetch("/notification/all", {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete all notifications");
  }
  return response.json();
}
