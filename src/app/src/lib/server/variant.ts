import { ServerFetch } from "@/types";
import { ProductSize, InventoryResponse } from "./product";

export type ProductVariantWithProductResponse = {
  id: string;
  productId: string;
  productName: string;
  size: ProductSize;
  color: string;
  imageId: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  inventory: InventoryResponse | null;
};

export type CreateProductVariantDto = {
  productId: string;
  size: ProductSize;
  color: string;
};

export type UpdateProductVariantDto = {
  size?: ProductSize;
  color?: string;
};

export default function initVariantController(fetch: ServerFetch) {
  return {
    // Get all variants
    getVariants: async (
      productId?: string,
      size?: ProductSize,
      color?: string,
    ): Promise<ProductVariantWithProductResponse[]> => {
      const params = new URLSearchParams();
      if (productId) params.append("productId", productId);
      if (size !== undefined) params.append("size", String(size));
      if (color) params.append("color", color);

      const url = `/variants${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch variants" }));
        throw new Error(error.message || "Failed to fetch variants");
      }

      return response.json();
    },

    // Get single variant
    getVariant: async (id: string): Promise<ProductVariantWithProductResponse> => {
      const response = await fetch(`/variants/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch variant" }));
        throw new Error(error.message || "Failed to fetch variant");
      }

      return response.json();
    },

    // Create variant
    createVariant: async (data: CreateProductVariantDto): Promise<ProductVariantWithProductResponse> => {
      const response = await fetch("/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create variant" }));
        throw new Error(error.message || "Failed to create variant");
      }

      return response.json();
    },

    // Update variant
    updateVariant: async (id: string, data: UpdateProductVariantDto): Promise<ProductVariantWithProductResponse> => {
      const response = await fetch(`/variants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update variant" }));
        throw new Error(error.message || "Failed to update variant");
      }

      return response.json();
    },

    // Delete variant
    deleteVariant: async (id: string): Promise<void> => {
      const response = await fetch(`/variants/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete variant" }));
        throw new Error(error.message || "Failed to delete variant");
      }
    },

    // Upload variant image
    uploadVariantImage: async (id: string, file: File): Promise<ProductVariantWithProductResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/variants/${id}/image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to upload image" }));
        throw new Error(error.message || "Failed to upload image");
      }

      return response.json();
    },

    // Remove variant image
    removeVariantImage: async (id: string): Promise<ProductVariantWithProductResponse> => {
      const response = await fetch(`/variants/${id}/image`, { method: "DELETE" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to remove image" }));
        throw new Error(error.message || "Failed to remove image");
      }

      return response.json();
    },

    // Get variants by size
    getVariantsBySize: async (size: ProductSize): Promise<ProductVariantWithProductResponse[]> => {
      const response = await fetch(`/variants/by-size/${size}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch variants by size" }));
        throw new Error(error.message || "Failed to fetch variants by size");
      }

      return response.json();
    },

    // Get variants by color
    getVariantsByColor: async (color: string): Promise<ProductVariantWithProductResponse[]> => {
      const response = await fetch(`/variants/by-color/${color}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch variants by color" }));
        throw new Error(error.message || "Failed to fetch variants by color");
      }

      return response.json();
    },
  };
}
