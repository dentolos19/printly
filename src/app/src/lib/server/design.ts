import { ServerFetch } from "@/types";

export type Design = {
  id: string;
  name: string;
  description?: string;
  data: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDesignDto = {
  name: string;
  description?: string;
  data: string;
};

export type UpdateDesignDto = {
  name?: string;
  description?: string;
  data?: string;
};

export default function initDesignController(fetch: ServerFetch) {
  return {
    getDesigns: async (): Promise<Design[]> => {
      const response = await fetch("/design", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch designs");
      }

      return response.json();
    },

    getDesign: async (id: string): Promise<Design> => {
      const response = await fetch(`/design/${id}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch design");
      }

      return response.json();
    },

    createDesign: async (data: CreateDesignDto): Promise<Design> => {
      const response = await fetch("/design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create design");
      }

      return response.json();
    },

    updateDesign: async (id: string, data: UpdateDesignDto): Promise<Design> => {
      const response = await fetch(`/design/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update design");
      }

      return response.json();
    },

    deleteDesign: async (id: string): Promise<void> => {
      const response = await fetch(`/design/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete design");
      }
    },
  };
}
