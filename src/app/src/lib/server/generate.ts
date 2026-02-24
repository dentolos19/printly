import { ServerFetch } from "@/types";

export type GeneratedImageData = {
  id: string;
  prompt: string;
  style?: string;
  type: string;
  createdAt: string;
};

export type PromptCheckResult = {
  hasViolation: boolean;
  detectedTerms?: string[];
  rewrittenPrompt: string;
  explanation?: string;
};

export type GenerateImageResult = {
  blob: Blob;
  assetId: string;
  promptRewritten?: boolean;
  rewrittenPrompt?: string;
  rewriteExplanation?: string;
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

    generateImage: async (prompt: string, style?: string): Promise<GenerateImageResult> => {
      const params = new URLSearchParams({ prompt });
      if (style) {
        params.set("style", style);
      }

      const response = await fetch(`/generate/image?${params}`, {
        method: "GET",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (body?.isCopyrightViolation) {
          const err = new Error(
            (body.message as string) || "Generated image contains copyrighted material.",
          ) as Error & {
            isCopyrightViolation: boolean;
            reason?: string;
            detectedItems?: string[];
          };
          err.isCopyrightViolation = true;
          err.reason = body.reason as string | undefined;
          err.detectedItems = body.detectedItems as string[] | undefined;
          throw err;
        }
        throw new Error("Failed to generate image");
      }

      const assetId = response.headers.get("X-Asset-Id") || "";
      const promptRewritten = response.headers.get("X-Prompt-Rewritten") === "true";
      const rewrittenPrompt = response.headers.get("X-Rewritten-Prompt") || undefined;
      const rewriteExplanation = response.headers.get("X-Rewrite-Explanation") || undefined;
      const blob = await response.blob();

      return { blob, assetId, promptRewritten, rewrittenPrompt, rewriteExplanation };
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

    checkPrompt: async (prompt: string): Promise<PromptCheckResult> => {
      const response = await fetch("/generate/check-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to check prompt");
      }

      return response.json();
    },
  };
}
