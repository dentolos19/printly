import { ServerFetch } from "@/types";

export type AiSalesAnalysisResponse = {
  analysis: string;
  generatedAt: string;
};

export default function initAnalysisController(fetch: ServerFetch) {
  return {
    // Get AI sales analysis (admin only)
    getAiSalesAnalysis: async (): Promise<AiSalesAnalysisResponse> => {
      const response = await fetch("/analysis/sales", { method: "GET" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to generate AI analysis" }));
        throw new Error(error.message || "Failed to generate AI analysis");
      }

      return response.json();
    },
  };
}
