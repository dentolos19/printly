import { ServerFetch } from "@/types";

// Enums matching backend
export enum ProductSize {
  S = 0,
  M = 1,
  L = 2,
}

export enum ProductColor {
  Red = 0,
  Blue = 1,
  Green = 2,
  Black = 3,
}

export const ProductSizeLabels: Record<ProductSize, string> = {
  [ProductSize.S]: "Small",
  [ProductSize.M]: "Medium",
  [ProductSize.L]: "Large",
};

export const ProductColorLabels: Record<ProductColor, string> = {
  [ProductColor.Red]: "Red",
  [ProductColor.Blue]: "Blue",
  [ProductColor.Green]: "Green",
  [ProductColor.Black]: "Black",
};

// Types
export type InventoryResponse = {
  id: string;
  variantId: string;
  quantity: number;
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariantResponse = {
  id: string;
  productId: string;
  size: ProductSize;
  color: ProductColor;
  createdAt: string;
  updatedAt: string;
  inventory: InventoryResponse | null;
};

export type ProductResponse = {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariantResponse[];
};

export type ProductSummaryResponse = {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variantCount: number;
  totalStock: number;
};

export type CreateProductDto = {
  name: string;
  basePrice: number;
  isActive?: boolean;
};

export type UpdateProductDto = {
  name?: string;
  basePrice?: number;
  isActive?: boolean;
};

export type CreateVariantForProductDto = {
  size: ProductSize;
  color: ProductColor;
  initialQuantity?: number;
  reorderLevel?: number;
};

export type CreateProductWithVariantsDto = {
  name: string;
  basePrice: number;
  isActive?: boolean;
  variants?: CreateVariantForProductDto[];
};

export default function initProductController(fetch: ServerFetch) {
  return {
    // Get all products with full details
    getProducts: async (isActive?: boolean): Promise<ProductResponse[]> => {
      const params = new URLSearchParams();
      if (isActive !== undefined) params.append("isActive", String(isActive));

      const url = `/products${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch products" }));
        throw new Error(error.message || "Failed to fetch products");
      }

      return response.json();
    },

    // Get product summaries
    getProductSummaries: async (isActive?: boolean): Promise<ProductSummaryResponse[]> => {
      const params = new URLSearchParams();
      if (isActive !== undefined) params.append("isActive", String(isActive));

      const url = `/products/summary${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch product summaries" }));
        throw new Error(error.message || "Failed to fetch product summaries");
      }

      return response.json();
    },

    // Get single product
    getProduct: async (id: string): Promise<ProductResponse> => {
      const response = await fetch(`/products/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch product" }));
        throw new Error(error.message || "Failed to fetch product");
      }

      return response.json();
    },

    // Create product
    createProduct: async (data: CreateProductDto): Promise<ProductResponse> => {
      const response = await fetch("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create product" }));
        throw new Error(error.message || "Failed to create product");
      }

      return response.json();
    },

    // Create product with variants
    createProductWithVariants: async (data: CreateProductWithVariantsDto): Promise<ProductResponse> => {
      const response = await fetch("/products/with-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create product with variants" }));
        throw new Error(error.message || "Failed to create product with variants");
      }

      return response.json();
    },

    // Update product
    updateProduct: async (id: string, data: UpdateProductDto): Promise<ProductResponse> => {
      const response = await fetch(`/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update product" }));
        throw new Error(error.message || "Failed to update product");
      }

      return response.json();
    },

    // Delete product
    deleteProduct: async (id: string): Promise<void> => {
      const response = await fetch(`/products/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete product" }));
        throw new Error(error.message || "Failed to delete product");
      }
    },

    // Deactivate product
    deactivateProduct: async (id: string): Promise<ProductResponse> => {
      const response = await fetch(`/products/${id}/deactivate`, { method: "POST" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to deactivate product" }));
        throw new Error(error.message || "Failed to deactivate product");
      }

      return response.json();
    },

    // Activate product
    activateProduct: async (id: string): Promise<ProductResponse> => {
      const response = await fetch(`/products/${id}/activate`, { method: "POST" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to activate product" }));
        throw new Error(error.message || "Failed to activate product");
      }

      return response.json();
    },

    // Get product variants
    getProductVariants: async (id: string): Promise<ProductVariantResponse[]> => {
      const response = await fetch(`/products/${id}/variants`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch product variants" }));
        throw new Error(error.message || "Failed to fetch product variants");
      }

      return response.json();
    },
  };
}
