import { ServerFetch } from "@/types";

export type PrintAreaResponse = {
  id: string;
  productId: string;
  areaId: string;
  name: string;
  meshName: string | null;
  rayDirection: [number, number, number];
  displayOrder: number;
  isAutoDetected: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePrintAreaDto = {
  productId: string;
  areaId: string;
  name: string;
  meshName?: string | null;
  rayDirection?: [number, number, number];
  displayOrder?: number;
};

export type UpdatePrintAreaDto = {
  areaId?: string;
  name?: string;
  meshName?: string | null;
  rayDirection?: [number, number, number];
  displayOrder?: number;
};

export type CreatePrintAreaItemDto = {
  areaId: string;
  name: string;
  meshName?: string | null;
  rayDirection?: [number, number, number];
  displayOrder?: number;
  isAutoDetected?: boolean;
};

export type BulkCreatePrintAreasDto = {
  productId: string;
  printAreas: CreatePrintAreaItemDto[];
};

export default function initPrintAreaController(fetch: ServerFetch) {
  return {
    getByProduct: async (productId: string): Promise<PrintAreaResponse[]> => {
      const response = await fetch(`/print-areas/product/${productId}`, { method: "GET" });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        const error = await response.json().catch(() => ({ message: "Failed to fetch print areas" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch print areas",
        );
      }

      return response.json();
    },

    getPrintArea: async (id: string): Promise<PrintAreaResponse> => {
      const response = await fetch(`/print-areas/${id}`, { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch print area" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to fetch print area",
        );
      }

      return response.json();
    },

    createPrintArea: async (dto: CreatePrintAreaDto): Promise<PrintAreaResponse> => {
      const response = await fetch("/print-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create print area" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to create print area",
        );
      }

      return response.json();
    },

    bulkCreatePrintAreas: async (dto: BulkCreatePrintAreasDto): Promise<PrintAreaResponse[]> => {
      const response = await fetch("/print-areas/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create print areas" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to create print areas",
        );
      }

      return response.json();
    },

    updatePrintArea: async (id: string, dto: UpdatePrintAreaDto): Promise<PrintAreaResponse> => {
      const response = await fetch(`/print-areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update print area" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to update print area",
        );
      }

      return response.json();
    },

    deletePrintArea: async (id: string): Promise<void> => {
      const response = await fetch(`/print-areas/${id}`, { method: "DELETE" });

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({ message: "Failed to delete print area" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to delete print area",
        );
      }
    },

    deleteAllForProduct: async (productId: string): Promise<void> => {
      const response = await fetch(`/print-areas/product/${productId}`, { method: "DELETE" });

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({ message: "Failed to delete print areas" }));
        throw new Error(
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Failed to delete print areas",
        );
      }
    },
  };
}
