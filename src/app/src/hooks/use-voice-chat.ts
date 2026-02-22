"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef } from "react";

export interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseVoiceChatOptions {
  onMessage?: (message: VoiceMessage) => void;
  onConnect?: () => void;
  onDisconnect?: (messages: VoiceMessage[]) => void;
  onError?: (error: string) => void;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const voiceMessagesRef = useRef<VoiceMessage[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const conversation = useConversation({
    onConnect: () => {
      setVoiceConnected(true);
      setVoiceError(null);
      voiceMessagesRef.current = [];
      optionsRef.current.onConnect?.();
    },
    onDisconnect: () => {
      setVoiceConnected(false);
      setIsListening(false);
      setIsSpeaking(false);
      setCurrentTranscript("");
      optionsRef.current.onDisconnect?.(voiceMessagesRef.current);
    },
    onMessage: (message) => {
      const msg = message as { source?: string; message?: string };

      if (msg.source === "ai" && msg.message) {
        const voiceMsg: VoiceMessage = {
          role: "assistant",
          content: msg.message,
          timestamp: new Date(),
        };
        voiceMessagesRef.current.push(voiceMsg);
        optionsRef.current.onMessage?.(voiceMsg);
      } else if (msg.source === "user" && msg.message) {
        setCurrentTranscript("");
        const voiceMsg: VoiceMessage = {
          role: "user",
          content: msg.message,
          timestamp: new Date(),
        };
        voiceMessagesRef.current.push(voiceMsg);
        optionsRef.current.onMessage?.(voiceMsg);
      }
    },
    onError: (error) => {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Voice connection error";
      setVoiceError(errorMessage);
      optionsRef.current.onError?.(errorMessage);
    },
    onModeChange: (mode) => {
      const modeData = mode as { mode?: string };
      setIsListening(modeData.mode === "listening");
      setIsSpeaking(modeData.mode === "speaking");
    },
  });

  const startVoice = useCallback(
    async (signedUrl: string) => {
      try {
        setVoiceError(null);
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        await conversation.startSession({
          signedUrl,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to start voice conversation";
        setVoiceError(errorMessage);
        optionsRef.current.onError?.(errorMessage);
      }
    },
    [conversation],
  );

  const stopVoice = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("Failed to end voice session:", error);
    }
  }, [conversation]);

  return {
    voiceConnected,
    isListening,
    isSpeaking,
    voiceError,
    currentTranscript,
    voiceStatus: conversation.status,
    startVoice,
    stopVoice,
  };
}
