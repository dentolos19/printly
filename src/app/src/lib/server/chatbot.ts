import { ServerFetch } from "@/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolAction {
  type: string;
  conversationId?: string;
  subject?: string;
}

export interface ChatbotResponse {
  message: string;
  actions?: ToolAction[];
}

export interface ChatbotStatus {
  available: boolean;
  features: string[];
}

export interface AIModel {
  id: string;
  displayName: string;
  description: string;
  isDefault: boolean;
}

export interface ModelsResponse {
  models: AIModel[];
}

export interface ChatbotHistoryMessage {
  role: "user" | "assistant";
  content: string;
  model: string | null;
  timestamp: string;
}

export interface HistoryResponse {
  messages: ChatbotHistoryMessage[];
}

export interface VoiceAgentResponse {
  signedUrl: string;
}

export default function initChatbotController(fetch: ServerFetch) {
  return {
    /**
     * Send a message to the chatbot
     */
    sendMessage: async (message: string, history?: ChatMessage[], model?: string): Promise<ChatbotResponse> => {
      const response = await fetch("/chatbot/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, history, model }),
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

    /**
     * Get available AI models
     */
    getModels: async (): Promise<ModelsResponse> => {
      const response = await fetch("/chatbot/models", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to get AI models");
      }

      return response.json();
    },

    /**
     * Get chat history for current user
     */
    getHistory: async (limit: number = 50): Promise<HistoryResponse> => {
      const response = await fetch(`/chatbot/history?limit=${limit}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to get chat history");
      }

      return response.json();
    },

    /**
     * Get a signed URL for the ElevenLabs voice AI agent
     */
    getVoiceAgent: async (): Promise<VoiceAgentResponse> => {
      const response = await fetch("/chatbot/voice-agent", {
        method: "GET",
      });

      if (!response.ok) {
        const errorData: { error?: string } = await response.json();
        throw new Error(errorData.error || "Failed to get voice agent");
      }

      return response.json();
    },

    /**
     * Save voice conversation transcript messages
     */
    saveVoiceMessages: async (messages: ChatMessage[]): Promise<{ saved: number }> => {
      const response = await fetch("/chatbot/voice-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData: { error?: string } = await response.json();
        throw new Error(errorData.error || "Failed to save voice messages");
      }

      return response.json();
    },
  };
}
