import { ServerFetch } from "@/types";
import { ProductSize, ProductColor } from "./product";

// Enums matching backend
export enum OrderStatus {
  PendingPayment = 0,
  Paid = 1,
  Processing = 2,
  Shipped = 3,
  Delivered = 4,
  Cancelled = 5,
}

export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: "Pending Payment",
  [OrderStatus.Paid]: "Paid",
  [OrderStatus.Processing]: "Processing",
  [OrderStatus.Shipped]: "Shipped",
  [OrderStatus.Delivered]: "Delivered",
  [OrderStatus.Cancelled]: "Cancelled",
};

export const OrderStatusColors: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: "bg-yellow-100 text-yellow-800",
  [OrderStatus.Paid]: "bg-blue-100 text-blue-800",
  [OrderStatus.Processing]: "bg-purple-100 text-purple-800",
  [OrderStatus.Shipped]: "bg-indigo-100 text-indigo-800",
  [OrderStatus.Delivered]: "bg-green-100 text-green-800",
  [OrderStatus.Cancelled]: "bg-red-100 text-red-800",
};

// Types
export type OrderItemResponse = {
  id: string;
  orderId: string;
  variantId: string;
  requestId: string | null;
  productName: string;
  size: ProductSize;
  color: ProductColor;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderResponse = {
  id: string;
  userId: string;
  userEmail: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
};

export type OrderSummaryResponse = {
  id: string;
  userId: string;
  userEmail: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderItemDto = {
  variantId: string;
  requestId?: string | null;
  quantity: number;
};

export type CreateOrderDto = {
  items: CreateOrderItemDto[];
};

export type UpdateOrderStatusDto = {
  status: OrderStatus;
};

export type AdminUpdateOrderDto = {
  status?: OrderStatus;
  totalAmount?: number;
};

export type AddOrderItemDto = {
  variantId: string;
  requestId?: string | null;
  quantity: number;
  unitPrice: number;
};

export type UpdateOrderItemDto = {
  quantity?: number;
  unitPrice?: number;
  requestId?: string | null;
};

export type UserOrderStatsResponse = {
  activeOrders: number;
  pendingPayment: number;
  completedOrders: number;
  totalSpent: number;
};

export type MonthlyRevenueData = {
  month: string;
  revenue: number;
  orderCount: number;
};

export type OrderStatusData = {
  status: string;
  count: number;
};

export type AdminOrderStatsResponse = {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  monthlyRevenue: MonthlyRevenueData[];
  statusDistribution: OrderStatusData[];
};

export default function initOrderController(fetch: ServerFetch) {
  return {
    // ==================== User Endpoints ====================

    // Get order statistics for current user
    getMyOrderStats: async (): Promise<UserOrderStatsResponse> => {
      const response = await fetch("/orders/my/stats", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch order stats" }));
        throw new Error(error.message || "Failed to fetch order stats");
      }

      return response.json();
    },

    // Get current user's orders
    getMyOrders: async (status?: OrderStatus): Promise<OrderSummaryResponse[]> => {
      const params = new URLSearchParams();
      if (status !== undefined) params.append("status", String(status));

      const url = `/orders/my${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch orders" }));
        throw new Error(error.message || "Failed to fetch orders");
      }

      return response.json();
    },

    // Get a specific order for current user
    getMyOrder: async (id: string): Promise<OrderResponse> => {
      const response = await fetch(`/orders/my/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch order" }));
        throw new Error(error.message || "Failed to fetch order");
      }

      return response.json();
    },

    // Create a new order
    createOrder: async (data: CreateOrderDto): Promise<OrderResponse> => {
      const response = await fetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create order" }));
        throw new Error(error.message || "Failed to create order");
      }

      return response.json();
    },

    // Cancel current user's order
    cancelMyOrder: async (id: string): Promise<OrderResponse> => {
      const response = await fetch(`/orders/my/${id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to cancel order" }));
        throw new Error(error.message || "Failed to cancel order");
      }

      return response.json();
    },

    // Pay for current user's order
    payMyOrder: async (id: string): Promise<OrderResponse> => {
      const response = await fetch(`/orders/my/${id}/pay`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to process payment" }));
        throw new Error(error.message || "Failed to process payment");
      }

      return response.json();
    },

    // ==================== Admin Endpoints ====================

    // Get admin order statistics
    getAdminOrderStats: async (): Promise<AdminOrderStatsResponse> => {
      const response = await fetch("/orders/stats", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch admin stats" }));
        throw new Error(error.message || "Failed to fetch admin stats");
      }

      return response.json();
    },

    // Get all orders (admin only)
    getAllOrders: async (status?: OrderStatus, userId?: string): Promise<OrderSummaryResponse[]> => {
      const params = new URLSearchParams();
      if (status !== undefined) params.append("status", String(status));
      if (userId) params.append("userId", userId);

      const url = `/orders${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch orders" }));
        throw new Error(error.message || "Failed to fetch orders");
      }

      return response.json();
    },

    // Get a specific order (admin only)
    getOrder: async (id: string): Promise<OrderResponse> => {
      const response = await fetch(`/orders/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch order" }));
        throw new Error(error.message || "Failed to fetch order");
      }

      return response.json();
    },

    // Update order status (admin only)
    updateOrderStatus: async (id: string, data: UpdateOrderStatusDto): Promise<OrderResponse> => {
      const response = await fetch(`/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update order status" }));
        throw new Error(error.message || "Failed to update order status");
      }

      return response.json();
    },

    // Update order (admin only)
    updateOrder: async (id: string, data: AdminUpdateOrderDto): Promise<OrderResponse> => {
      const response = await fetch(`/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update order" }));
        throw new Error(error.message || "Failed to update order");
      }

      return response.json();
    },

    // Delete order (admin only)
    deleteOrder: async (id: string): Promise<void> => {
      const response = await fetch(`/orders/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete order" }));
        throw new Error(error.message || "Failed to delete order");
      }
    },
  };
}
