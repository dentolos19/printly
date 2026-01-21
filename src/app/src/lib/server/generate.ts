import { ServerFetch } from "@/types";

export type GeneratedImageData = {
  id: string;
  prompt: string;
  style?: string;
  type: string;
  createdAt: string;
};

export default function initGenerateController(fetch: ServerFetch) {
  return {
    generateText: async (prompt: string) => {
      const response = await fetch(`/generate/text?${new URLSearchParams({ prompt })}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate text");
      }

      const data = await response.json();
      return data;
    },

    generateImage: async (prompt: string, style?: string): Promise<{ blob: Blob; assetId: string }> => {
      const params = new URLSearchParams({ prompt });
      if (style) {
        params.set("style", style);
      }

      const response = await fetch(`/generate/image?${params}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const assetId = response.headers.get("X-Asset-Id") || "";
      const blob = await response.blob();

      return { blob, assetId };
    },

    getGeneratedImages: async (): Promise<GeneratedImageData[]> => {
      const response = await fetch("/generate/images", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch generated images");
      }

      return response.json();
    },

    getGeneratedImageBlob: async (id: string): Promise<Blob> => {
      const response = await fetch(`/generate/images/${id}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch generated image");
      }

      return response.blob();
    },
  };
}
