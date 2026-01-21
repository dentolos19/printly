import { ServerFetch } from "@/types";

export type ConversationParticipant = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: number;
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

export type ConversationSummary = {
  id: string;
  subject?: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    isRead: boolean;
    isDeleted: boolean;
    isEdited: boolean;
    createdAt: string;
  } | null;
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

export default function initConversationController(fetch: ServerFetch) {
  return {
    getContacts: async (): Promise<Contact[]> => {
      const response = await fetch("/conversation/contacts", { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load contacts");
      }
      return response.json();
    },

    listConversations: async (includeAllForStaff: boolean): Promise<ConversationSummary[]> => {
      const endpoint = includeAllForStaff ? "/conversation?includeAllForStaff=true" : "/conversation";
      const response = await fetch(endpoint, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }
      return response.json();
    },

    createConversation: async (payload: CreateConversationPayload): Promise<ConversationSummary> => {
      const response = await fetch("/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create conversation" }));
        throw new Error((error as { message?: string }).message ?? "Failed to create conversation");
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
  };
}
