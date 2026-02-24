import { ServerFetch } from "@/types";

export type Asset = {
  id: string;
  name: string;
  description?: string;
  type: string;
  hash: string;
  size: number;
  isGenerated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateAssetDto = {
  name?: string;
  description?: string;
};

export type DownloadAssetResponse = {
  url: string;
};

export default function initAssetController(fetch: ServerFetch) {
  return {
    getAssets: async (): Promise<Asset[]> => {
      const response = await fetch("/asset", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }

      return response.json();
    },

    getAsset: async (id: string): Promise<Asset> => {
      const response = await fetch(`/asset/${id}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch asset");
      }

      return response.json();
    },

    uploadAsset: async (file: File, description?: string, category?: string): Promise<Asset> => {
      const formData = new FormData();
      formData.append("file", file);
      if (description) {
        formData.append("description", description);
      }
      if (category) {
        formData.append("category", category);
      }

      const response = await fetch("/asset", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (body?.isCopyrightViolation) {
          const err = new Error((body.message as string) || "This image contains copyrighted material.") as Error & {
            isCopyrightViolation: boolean;
            reason?: string;
            detectedItems?: string[];
          };
          err.isCopyrightViolation = true;
          err.reason = body.reason as string | undefined;
          err.detectedItems = body.detectedItems as string[] | undefined;
          throw err;
        }
        throw new Error("Failed to upload asset");
      }

      return response.json();
    },

    downloadAsset: async (id: string): Promise<DownloadAssetResponse> => {
      const response = await fetch(`/asset/${id}/download`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }

      return response.json();
    },

    updateAsset: async (id: string, data: UpdateAssetDto): Promise<Asset> => {
      const response = await fetch(`/asset/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update asset");
      }

      return response.json();
    },

    deleteAsset: async (id: string): Promise<void> => {
      const response = await fetch(`/asset/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }
    },

    getThumbnail: async (id: string): Promise<Blob | null> => {
      try {
        const response = await fetch(`/asset/${id}/thumbnail`, {
          method: "GET",
        });

        if (!response.ok) return null;
        return response.blob();
      } catch {
        return null;
      }
    },
  };
}
