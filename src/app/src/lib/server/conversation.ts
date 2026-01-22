import { ServerFetch } from "@/types";

export type ConversationParticipantRole = 0 | 1; // 0 = Member, 1 = Admin

export type ConversationStatus = 0 | 1 | 2 | 3; // Pending, Active, Resolved, Closed

export type ConversationPriority = 0 | 1 | 2 | 3; // Low, Normal, High, Urgent

export type ConversationParticipant = {
  id: string;
  userno: string;
  name: string;
  email: string;
  role: ConversationParticipantRole;
  isCurrentUser: boolean;
};

export type ConversationMessage = {
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
};

export type MessagePreview = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  isRead: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  subject?: string | null;
  customerId: string;
  customerName: string;
  supportMode: boolean;
  status: ConversationStatus;
  priority: ConversationPriority;
  orderId?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessage?: MessagePreview | null;
  participants: ConversationParticipant[];
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type CreateConversationPayload = {
  participantIds: string[];
  subject?: string | null;
};

export type CreateSupportConversationPayload = {
  subject: string;
  orderId?: string | null;
  initialMessage?: string | null;
};

export type UpdateStatusPayload = {
  status: ConversationStatus;
};

export type UpdatePriorityPayload = {
  priority: ConversationPriority;
};

export const ConversationStatusLabels: Record<ConversationStatus, string> = {
  0: "Pending",
  1: "Active",
  2: "Resolved",
  3: "Closed",
};

export const ConversationPriorityLabels: Record<ConversationPriority, string> = {
  0: "Low",
  1: "Normal",
  2: "High",
  3: "Urgent",
};

export default function initConversationController(fetch: ServerFetch) {
  return {
    getContacts: async (): Promise<Contact[]> => {
      const response = await fetch("/conversation/contacts", { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load contacts");
      }
      return response.json();
    },

    listConversations: async (
      includeAllForStaff = false,
      status?: ConversationStatus,
    ): Promise<ConversationSummary[]> => {
      const params = new URLSearchParams();
      if (includeAllForStaff) params.set("includeAllForStaff", "true");
      if (status !== undefined) params.set("status", status.toString());
      const query = params.toString();
      const endpoint = query ? `/conversation?${query}` : "/conversation";
      const response = await fetch(endpoint, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }
      return response.json();
    },

    createConversation: async (payload: CreateConversationPayload): Promise<ConversationSummary> => {
      const response = await fetch("/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create conversation" }));
        throw new Error((error as { message?: string }).message ?? "Failed to create conversation");
      }
      return response.json();
    },

    createSupportConversation: async (payload: CreateSupportConversationPayload): Promise<ConversationSummary> => {
      const response = await fetch("/conversation/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create support conversation" }));
        throw new Error((error as { message?: string }).message ?? "Failed to create support conversation");
      }
      return response.json();
    },

    getMessages: async (conversationId: string, take = 100): Promise<ConversationMessage[]> => {
      const response = await fetch(`/conversation/${conversationId}/messages?take=${take}`, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }
      return response.json();
    },

    markRead: async (conversationId: string): Promise<void> => {
      const response = await fetch(`/conversation/${conversationId}/read`, { method: "POST" });
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to mark conversation as read");
      }
    },

    updateStatus: async (conversationId: string, payload: UpdateStatusPayload): Promise<void> => {
      const response = await fetch(`/conversation/${conversationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to update conversation status");
      }
    },

    updatePriority: async (conversationId: string, payload: UpdatePriorityPayload): Promise<void> => {
      const response = await fetch(`/conversation/${conversationId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to update conversation priority");
      }
    },
  };
}
