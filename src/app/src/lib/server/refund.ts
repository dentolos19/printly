import { ServerFetch } from "@/types";
import { OrderStatus } from "./order";

// Enums matching backend
export enum RefundStatus {
  Requested = 0,
  UnderReview = 1,
  Approved = 2,
  Rejected = 3,
  Processing = 4,
  Completed = 5,
  Failed = 6,
}

export enum RefundReason {
  // Pre-shipping reasons (available for Paid, Processing)
  ChangedMind = 0,
  OrderedByMistake = 1,
  FoundBetterPrice = 2,
  TooLongToProcess = 3,

  // Post-shipping reasons (available for Shipped, Delivered)
  DamagedInShipping = 4,
  WrongItemReceived = 5,
  ItemNotAsDescribed = 6,
  DefectiveProduct = 7,
  WrongSize = 8,
  QualityNotAsExpected = 9,
  NeverReceived = 10,

  // Always available
  Other = 11,
}

export const RefundStatusLabels: Record<RefundStatus, string> = {
  [RefundStatus.Requested]: "Requested",
  [RefundStatus.UnderReview]: "Under Review",
  [RefundStatus.Approved]: "Approved",
  [RefundStatus.Rejected]: "Rejected",
  [RefundStatus.Processing]: "Processing",
  [RefundStatus.Completed]: "Completed",
  [RefundStatus.Failed]: "Failed",
};

export const RefundStatusColors: Record<RefundStatus, string> = {
  [RefundStatus.Requested]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  [RefundStatus.UnderReview]: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  [RefundStatus.Approved]: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  [RefundStatus.Rejected]: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  [RefundStatus.Processing]: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  [RefundStatus.Completed]: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  [RefundStatus.Failed]: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

export const RefundReasonLabels: Record<RefundReason, string> = {
  // Pre-shipping
  [RefundReason.ChangedMind]: "Changed My Mind",
  [RefundReason.OrderedByMistake]: "Ordered by Mistake",
  [RefundReason.FoundBetterPrice]: "Found Better Price",
  [RefundReason.TooLongToProcess]: "Taking Too Long to Process",

  // Post-shipping
  [RefundReason.DamagedInShipping]: "Damaged in Shipping",
  [RefundReason.WrongItemReceived]: "Wrong Item Received",
  [RefundReason.ItemNotAsDescribed]: "Item Not as Described",
  [RefundReason.DefectiveProduct]: "Defective Product",
  [RefundReason.WrongSize]: "Wrong Size",
  [RefundReason.QualityNotAsExpected]: "Quality Not as Expected",
  [RefundReason.NeverReceived]: "Never Received",

  // Always available
  [RefundReason.Other]: "Other",
};

// Helper to get available refund reasons based on order status
export function getAvailableRefundReasons(orderStatus: OrderStatus): RefundReason[] {
  const preShippingReasons = [
    RefundReason.ChangedMind,
    RefundReason.OrderedByMistake,
    RefundReason.FoundBetterPrice,
    RefundReason.TooLongToProcess,
  ];

  const postShippingReasons = [
    RefundReason.DamagedInShipping,
    RefundReason.WrongItemReceived,
    RefundReason.ItemNotAsDescribed,
    RefundReason.DefectiveProduct,
    RefundReason.WrongSize,
    RefundReason.QualityNotAsExpected,
    RefundReason.NeverReceived,
  ];

  const alwaysAvailable = [RefundReason.Other];

  // Pre-shipping (Paid, Processing)
  if (orderStatus === OrderStatus.Paid || orderStatus === OrderStatus.Processing) {
    return [...preShippingReasons, ...alwaysAvailable];
  }

  // Post-shipping (Shipped, Delivered)
  if (orderStatus === OrderStatus.Shipped || orderStatus === OrderStatus.Delivered) {
    return [...postShippingReasons, ...alwaysAvailable];
  }

  // Default - all reasons
  return [...preShippingReasons, ...postShippingReasons, ...alwaysAvailable];
}

// Types
export type RefundResponse = {
  id: string;
  paymentId: string;
  orderId: string;
  requestedByUserId: string;
  requestedByUserName: string;
  processedByUserId: string | null;
  processedByUserName: string | null;
  requestedAmount: number;
  approvedAmount: number | null;
  reason: RefundReason;
  customerNotes: string | null;
  adminNotes: string | null;
  status: RefundStatus;
  requestedAt: string;
  processedAt: string | null;
  stripeRefundId: string | null;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RefundSummaryResponse = {
  id: string;
  orderId: string;
  requestedAmount: number;
  approvedAmount: number | null;
  reason: RefundReason;
  status: RefundStatus;
  requestedAt: string;
  processedAt: string | null;
};

export type RefundWithOrderResponse = RefundResponse & {
  orderTotalAmount: number;
  orderStatus: OrderStatus;
  orderItemCount: number;
};

export type CreateRefundRequest = {
  orderId: string;
  requestedAmount: number;
  reason: RefundReason;
  customerNotes?: string;
};

export type ApproveRefundRequest = {
  approvedAmount?: number;
  adminNotes?: string;
};

export type RejectRefundRequest = {
  adminNotes?: string;
};

export default function initRefundController(fetch: ServerFetch) {
  return {
    // ==================== User Endpoints ====================

    // Request a refund for an order
    createRefundRequest: async (request: CreateRefundRequest): Promise<RefundResponse> => {
      const response = await fetch("/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create refund request" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to create refund request",
        );
      }

      return response.json();
    },

    // Get all refunds for current user
    getMyRefunds: async (): Promise<RefundSummaryResponse[]> => {
      const response = await fetch("/refunds/my", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch refunds" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch refunds",
        );
      }

      return response.json();
    },

    // Get refund for a specific order
    getRefundByOrder: async (orderId: string): Promise<RefundResponse> => {
      const response = await fetch(`/refunds/order/${orderId}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch refund" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch refund",
        );
      }

      return response.json();
    },

    // Cancel a pending refund request
    cancelRefundRequest: async (id: string): Promise<void> => {
      const response = await fetch(`/refunds/${id}/cancel`, {
        method: "PUT",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to cancel refund request" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to cancel refund request",
        );
      }
    },

    // ==================== Admin Endpoints ====================

    // Get all refund requests (admin only)
    getAllRefunds: async (status?: RefundStatus): Promise<RefundWithOrderResponse[]> => {
      const params = new URLSearchParams();
      if (status !== undefined) params.append("status", String(status));

      const url = `/refunds${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch refunds" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch refunds",
        );
      }

      return response.json();
    },

    // Get a specific refund (admin only)
    getRefund: async (id: string): Promise<RefundResponse> => {
      const response = await fetch(`/refunds/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch refund" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch refund",
        );
      }

      return response.json();
    },

    // Mark refund as under review (admin only)
    markUnderReview: async (id: string): Promise<RefundResponse> => {
      const response = await fetch(`/refunds/${id}/review`, {
        method: "PUT",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to mark refund as under review" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to mark refund as under review",
        );
      }

      return response.json();
    },

    // Approve a refund request (admin only)
    approveRefund: async (id: string, request: ApproveRefundRequest): Promise<RefundResponse> => {
      const response = await fetch(`/refunds/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to approve refund" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to approve refund",
        );
      }

      return response.json();
    },

    // Reject a refund request (admin only)
    rejectRefund: async (id: string, request: RejectRefundRequest): Promise<RefundResponse> => {
      const response = await fetch(`/refunds/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to reject refund" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to reject refund",
        );
      }

      return response.json();
    },

    // Process an approved refund through Stripe (admin only)
    processRefund: async (id: string): Promise<RefundResponse> => {
      const response = await fetch(`/refunds/${id}/process`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to process refund" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to process refund",
        );
      }

      return response.json();
    },

    // Link a conversation to a refund (admin only)
    linkConversation: async (id: string, conversationId: string): Promise<RefundResponse> => {
      const response = await fetch(`/refunds/${id}/conversation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conversationId),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to link conversation" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to link conversation",
        );
      }

      return response.json();
    },
  };
}
