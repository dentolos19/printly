import { ServerFetch } from "@/types";

// Enums matching backend
export enum PaymentStatus {
  Pending = 0,
  Paid = 1,
  Failed = 2,
  Refunded = 3,
  Cancelled = 4,
}

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: "Pending",
  [PaymentStatus.Paid]: "Paid",
  [PaymentStatus.Failed]: "Failed",
  [PaymentStatus.Refunded]: "Refunded",
  [PaymentStatus.Cancelled]: "Cancelled",
};

export const PaymentStatusColors: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: "bg-yellow-100 text-yellow-800",
  [PaymentStatus.Paid]: "bg-green-100 text-green-800",
  [PaymentStatus.Failed]: "bg-red-100 text-red-800",
  [PaymentStatus.Refunded]: "bg-purple-100 text-purple-800",
  [PaymentStatus.Cancelled]: "bg-gray-100 text-gray-800",
};

// Types
export type PaymentResponse = {
  id: string;
  orderId: string;
  stripeCheckoutSessionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type PaymentSummaryResponse = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
};

export type CreateCheckoutSessionRequest = {
  orderId: string;
};

export type CheckoutSessionResponse = {
  checkoutUrl: string;
  sessionId: string;
};

export default function initPaymentController(fetch: ServerFetch) {
  return {
    // ==================== User Endpoints ====================

    // Create a checkout session for an order
    createCheckoutSession: async (orderId: string): Promise<CheckoutSessionResponse> => {
      const response = await fetch("/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create checkout session" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to create checkout session",
        );
      }

      return response.json();
    },

    // Verify checkout session after redirect
    verifyCheckoutSession: async (sessionId: string): Promise<PaymentResponse> => {
      const response = await fetch(`/payments/verify?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to verify payment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to verify payment",
        );
      }

      return response.json();
    },

    // Get payment for a specific order
    getPaymentByOrder: async (orderId: string): Promise<PaymentResponse> => {
      const response = await fetch(`/payments/order/${orderId}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch payment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch payment",
        );
      }

      return response.json();
    },

    // Get all payments for current user
    getMyPayments: async (): Promise<PaymentSummaryResponse[]> => {
      const response = await fetch("/payments/my", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch payments" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch payments",
        );
      }

      return response.json();
    },

    // ==================== Admin Endpoints ====================

    // Get all payments (admin only)
    getAllPayments: async (status?: PaymentStatus): Promise<PaymentResponse[]> => {
      const params = new URLSearchParams();
      if (status !== undefined) params.append("status", String(status));

      const url = `/payments${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch payments" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch payments",
        );
      }

      return response.json();
    },

    // Get a specific payment (admin only)
    getPayment: async (id: string): Promise<PaymentResponse> => {
      const response = await fetch(`/payments/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch payment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch payment",
        );
      }

      return response.json();
    },

    // Refund a payment (admin only)
    refundPayment: async (id: string): Promise<PaymentResponse> => {
      const response = await fetch(`/payments/${id}/refund`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to refund payment" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to refund payment",
        );
      }

      return response.json();
    },
  };
}
