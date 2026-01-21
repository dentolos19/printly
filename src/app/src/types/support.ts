// Ticket system types matching the backend schema

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

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  isReadByCustomer: boolean;
  isReadByAdmin: boolean;
  replyToMessageId?: string;
  replyToContent?: string;
  replyToSenderName?: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  orderId?: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  ticketId: string;
  isAdmin?: boolean;
}

export interface MessageEditedEvent {
  messageId: string;
  ticketId: string;
  content: string;
  isEdited: boolean;
  editedAt: string;
}

export interface MessageDeletedEvent {
  messageId: string;
  ticketId: string;
  isDeleted: boolean;
  deletedAt: string;
}

export interface ReadReceiptEvent {
  ticketId: string;
  readerId: string;
  messageIds: string[];
  readAt: string;
}

export interface StatusUpdatedEvent {
  ticketId: string;
  status: TicketStatus;
  updatedByUserId: string;
  updatedByUserName: string;
  updatedAt: string;
}

export interface PriorityUpdatedEvent {
  ticketId: string;
  priority: TicketPriority;
  updatedByUserId: string;
  updatedByUserName: string;
  updatedAt: string;
}

// Helper functions to convert enum values to readable strings
export function getStatusLabel(status: TicketStatus): string {
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
}

export function getPriorityLabel(priority: TicketPriority): string {
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
}

export function getStatusColor(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.Pending:
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case TicketStatus.Active:
      return "text-blue-600 bg-blue-50 border-blue-200";
    case TicketStatus.Resolved:
      return "text-green-600 bg-green-50 border-green-200";
    case TicketStatus.Closed:
      return "text-gray-600 bg-gray-50 border-gray-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function getPriorityColor(priority: TicketPriority): string {
  switch (priority) {
    case TicketPriority.Low:
      return "text-green-600 bg-green-50 border-green-200";
    case TicketPriority.Normal:
      return "text-blue-600 bg-blue-50 border-blue-200";
    case TicketPriority.High:
      return "text-orange-600 bg-orange-50 border-orange-200";
    case TicketPriority.Urgent:
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}
