import { ServerFetch } from "@/types";

export default function generateController(fetch: ServerFetch) {
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

    generateImage: async (prompt: string) => {
      const response = await fetch(`/generate/image?${new URLSearchParams({ prompt })}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      return response.blob();
    },
  };
}
