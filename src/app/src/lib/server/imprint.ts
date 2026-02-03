import { ServerFetch } from "@/types";

export type Imprint = {
  id: string;
  name: string;
  description?: string;
  data: string;
  productId?: string | null;
  productName?: string | null;
  previewId?: string | null;
  customizationPrice: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateImprintDto = {
  name: string;
  description?: string;
  data: string;
  productId?: string | null;
  previewId?: string | null;
};

export type UpdateImprintDto = {
  name?: string;
  description?: string;
  data?: string;
  productId?: string | null;
  previewId?: string | null;
};

export type ImprintValidationResponse = {
  isValid: boolean;
  customizationPrice: number;
  message?: string | null;
};

export default function initImprintController(fetch: ServerFetch) {
  return {
    getImprints: async (): Promise<Imprint[]> => {
      const response = await fetch("/imprint", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch imprints");
      }

      return response.json();
    },

    getImprint: async (id: string): Promise<Imprint> => {
      const response = await fetch(`/imprint/${id}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to fetch imprint (${response.status}): ${errorText}`);
      }

      return response.json();
    },

    createImprint: async (data: CreateImprintDto): Promise<Imprint> => {
      const response = await fetch("/imprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create imprint");
      }

      return response.json();
    },

    updateImprint: async (id: string, data: UpdateImprintDto): Promise<Imprint> => {
      const response = await fetch(`/imprint/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update imprint");
      }

      return response.json();
    },

    deleteImprint: async (id: string): Promise<void> => {
      const response = await fetch(`/imprint/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete imprint");
      }
    },

    validateImprintForProduct: async (imprintId: string, productId: string): Promise<ImprintValidationResponse> => {
      const response = await fetch(`/imprint/${imprintId}/validate/${productId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to validate imprint for product");
      }

      return response.json();
    },
  };
}
