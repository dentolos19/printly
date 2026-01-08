import { ServerFetch } from "@/types";
import { ProductSize, ProductColor } from "./product";

export type InventoryWithVariantResponse = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  size: ProductSize;
  color: ProductColor;
  quantity: number;
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
};

export type LowStockAlertResponse = {
  inventoryId: string;
  variantId: string;
  productId: string;
  productName: string;
  size: ProductSize;
  color: ProductColor;
  quantity: number;
  reorderLevel: number;
};

export type CreateInventoryDto = {
  variantId: string;
  quantity: number;
  reorderLevel: number;
};

export type UpdateInventoryDto = {
  quantity?: number;
  reorderLevel?: number;
};

export type AdjustInventoryDto = {
  adjustment: number;
};

export type TotalStockResponse = {
  totalStock: number;
  totalVariants: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export default function initInventoryController(fetch: ServerFetch) {
  return {
    // Get all inventory
    getAllInventory: async (): Promise<InventoryWithVariantResponse[]> => {
      const response = await fetch("/inventory", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch inventory" }));
        throw new Error(error.message || "Failed to fetch inventory");
      }

      return response.json();
    },

    // Get inventory by variant
    getInventoryByVariant: async (variantId: string): Promise<InventoryWithVariantResponse> => {
      const response = await fetch(`/inventory/variant/${variantId}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch inventory for variant" }));
        throw new Error(error.message || "Failed to fetch inventory for variant");
      }

      return response.json();
    },

    // Get inventory by product
    getInventoryByProduct: async (productId: string): Promise<InventoryWithVariantResponse[]> => {
      const response = await fetch(`/inventory/product/${productId}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch inventory for product" }));
        throw new Error(error.message || "Failed to fetch inventory for product");
      }

      return response.json();
    },

    // Get inventory by ID
    getInventory: async (id: string): Promise<InventoryWithVariantResponse> => {
      const response = await fetch(`/inventory/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch inventory" }));
        throw new Error(error.message || "Failed to fetch inventory");
      }

      return response.json();
    },

    // Create inventory
    createInventory: async (data: CreateInventoryDto): Promise<InventoryWithVariantResponse> => {
      const response = await fetch("/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create inventory" }));
        throw new Error(error.message || "Failed to create inventory");
      }

      return response.json();
    },

    // Update inventory by variant
    updateInventoryByVariant: async (
      variantId: string,
      data: UpdateInventoryDto,
    ): Promise<InventoryWithVariantResponse> => {
      const response = await fetch(`/inventory/variant/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update inventory" }));
        throw new Error(error.message || "Failed to update inventory");
      }

      return response.json();
    },

    // Update inventory by ID
    updateInventory: async (id: string, data: UpdateInventoryDto): Promise<InventoryWithVariantResponse> => {
      const response = await fetch(`/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update inventory" }));
        throw new Error(error.message || "Failed to update inventory");
      }

      return response.json();
    },

    // Delete inventory
    deleteInventory: async (id: string): Promise<void> => {
      const response = await fetch(`/inventory/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete inventory" }));
        throw new Error(error.message || "Failed to delete inventory");
      }
    },

    // Adjust inventory
    adjustInventory: async (variantId: string, data: AdjustInventoryDto): Promise<InventoryWithVariantResponse> => {
      const response = await fetch(`/inventory/variant/${variantId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to adjust inventory" }));
        throw new Error(error.message || "Failed to adjust inventory");
      }

      return response.json();
    },

    // Get low stock items
    getLowStockItems: async (): Promise<LowStockAlertResponse[]> => {
      const response = await fetch("/inventory/low-stock", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch low stock items" }));
        throw new Error(error.message || "Failed to fetch low stock items");
      }

      return response.json();
    },

    // Get out of stock items
    getOutOfStockItems: async (): Promise<LowStockAlertResponse[]> => {
      const response = await fetch("/inventory/out-of-stock", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch out of stock items" }));
        throw new Error(error.message || "Failed to fetch out of stock items");
      }

      return response.json();
    },

    // Get total stock
    getTotalStock: async (): Promise<TotalStockResponse> => {
      const response = await fetch("/inventory/total", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch total stock" }));
        throw new Error(error.message || "Failed to fetch total stock");
      }

      return response.json();
    },
  };
}
