import { ServerFetch } from "@/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotResponse {
  message: string;
}

export interface ChatbotStatus {
  available: boolean;
  features: string[];
}

export default function initChatbotController(fetch: ServerFetch) {
  return {
    /**
     * Send a message to the chatbot
     */
    sendMessage: async (message: string, history?: ChatMessage[]): Promise<ChatbotResponse> => {
      const response = await fetch("/chatbot/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) {
        const errorData: { error?: string } = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      return response.json();
    },

    /**
     * Get chatbot status
     */
    getStatus: async (): Promise<ChatbotStatus> => {
      const response = await fetch("/chatbot/status", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to get chatbot status");
      }

      return response.json();
    },
  };
}
