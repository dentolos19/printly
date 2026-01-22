import { ServerFetch } from "@/types";

export type Imprint = {
  id: string;
  name: string;
  description?: string;
  data: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateImprintDto = {
  name: string;
  description?: string;
  data: string;
};

export type UpdateImprintDto = {
  name?: string;
  description?: string;
  data?: string;
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
        throw new Error("Failed to fetch imprint");
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
  };
}
