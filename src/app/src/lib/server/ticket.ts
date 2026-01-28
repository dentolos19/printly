import { ServerFetch } from "@/types";

// ===== Enums =====
export enum TicketStatus {
  Pending = 0,
  Active = 1,
  Resolved = 2,
  Closed = 3,
}

export enum TicketPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3,
}

// ===== Types =====
export type Ticket = {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  orderId?: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  content: string;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  isReadByCustomer: boolean;
  isReadByAdmin: boolean;
  createdAt: string;
  replyToMessageId?: string | null;
  replyToContent?: string | null;
  replyToSenderName?: string | null;
  // File attachment fields
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  // Voice message fields
  voiceMessageUrl?: string | null;
  voiceMessageDuration?: number | null;
};

export type CreateTicketPayload = {
  subject: string;
  orderId?: string | null;
};

export type UpdateStatusPayload = {
  status: TicketStatus;
};

// ===== Helper Functions =====
export const getStatusLabel = (status: TicketStatus): string => {
  switch (status) {
    case TicketStatus.Pending:
      return "Pending";
    case TicketStatus.Active:
      return "Active";
    case TicketStatus.Resolved:
      return "Resolved";
    case TicketStatus.Closed:
      return "Closed";
    default:
      return "Unknown";
  }
};

export const getStatusColor = (status: TicketStatus): string => {
  switch (status) {
    case TicketStatus.Pending:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case TicketStatus.Active:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case TicketStatus.Resolved:
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case TicketStatus.Closed:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getPriorityLabel = (priority: TicketPriority): string => {
  switch (priority) {
    case TicketPriority.Low:
      return "Low";
    case TicketPriority.Normal:
      return "Normal";
    case TicketPriority.High:
      return "High";
    case TicketPriority.Urgent:
      return "Urgent";
    default:
      return "Unknown";
  }
};

export const getPriorityColor = (priority: TicketPriority): string => {
  switch (priority) {
    case TicketPriority.Low:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    case TicketPriority.Normal:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case TicketPriority.High:
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case TicketPriority.Urgent:
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// ===== Controller =====
export default function initTicketController(fetch: ServerFetch) {
  return {
    /**
     * Create a new support ticket.
     */
    createTicket: async (payload: CreateTicketPayload): Promise<Ticket> => {
      const response = await fetch("/ticket", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }
      return response.json();
    },

    /**
     * Get all tickets. Admins see all, users see only their own.
     */
    getTickets: async (status?: TicketStatus): Promise<Ticket[]> => {
      const endpoint = status !== undefined ? `/ticket?status=${status}` : "/ticket";
      const response = await fetch(endpoint, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load tickets");
      }
      return response.json();
    },

    /**
     * Get a single ticket by ID.
     */
    getTicket: async (ticketId: string): Promise<Ticket> => {
      const response = await fetch(`/ticket/${ticketId}`, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load ticket");
      }
      return response.json();
    },

    /**
     * Get all messages in a ticket.
     */
    getTicketMessages: async (ticketId: string): Promise<TicketMessage[]> => {
      const response = await fetch(`/ticket/${ticketId}/messages`, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load ticket messages");
      }
      return response.json();
    },

    /**
     * Mark all messages in a ticket as read.
     */
    markAsRead: async (ticketId: string): Promise<void> => {
      const response = await fetch(`/ticket/${ticketId}/mark-read`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to mark ticket as read");
      }
    },

    /**
     * Update ticket status (Admin only).
     */
    updateStatus: async (ticketId: string, status: TicketStatus): Promise<void> => {
      const response = await fetch(`/ticket/${ticketId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("Failed to update ticket status");
      }
    },

    /**
     * Update ticket priority (Admin only).
     */
    updatePriority: async (ticketId: string, priority: TicketPriority): Promise<void> => {
      const response = await fetch(`/ticket/${ticketId}/priority`, {
        method: "PUT",
        body: JSON.stringify(priority),
      });
      if (!response.ok) {
        throw new Error("Failed to update ticket priority");
      }
    },
  };
}
