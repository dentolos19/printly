"use client";

import {
  AlertCircle,
  AudioLines,
  Bot,
  Cpu,
  ExternalLink,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  Send,
  TicketCheck,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Textarea } from "#/components/ui/textarea";
import { API_URL } from "#/environment";
import { useVoiceChat, type VoiceMessage } from "#/hooks/use-voice-chat";
import { useAuth } from "#/lib/providers/auth";
import type { AIModel, ToolAction } from "#/lib/server/chatbot";
import { cn, formatMessageTime } from "#/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
  actions?: ToolAction[];
}

export function ChatbotWidget() {
  const { tokens } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("google/gemini-2.5-flash");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice chat hook
  const { voiceConnected, isListening, isSpeaking, voiceError, voiceStatus, startVoice, stopVoice } = useVoiceChat({
    onMessage: (message: VoiceMessage) => {
      setMessages((prev) => [
        ...prev,
        {
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
        },
      ]);
    },
    onConnect: () => {
      setVoiceActive(true);
    },
    onDisconnect: async (voiceMessages: VoiceMessage[]) => {
      setVoiceActive(false);
      // Save voice transcript to database
      if (voiceMessages.length > 0 && tokens?.accessToken) {
        try {
          await fetch(`${API_URL}/chatbot/voice-messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: voiceMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            }),
          });
        } catch (err) {
          console.error("Failed to save voice transcript:", err);
        }
      }
    },
    onError: (errorMsg: string) => {
      setError(errorMsg);
      setVoiceActive(false);
      setVoiceLoading(false);
    },
  });

  // Toggle voice chat
  const toggleVoice = useCallback(async () => {
    if (voiceActive || voiceConnected) {
      await stopVoice();
      return;
    }

    if (!tokens?.accessToken) return;
    setVoiceLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/chatbot/voice-agent`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize voice agent");
      }

      const data = (await response.json()) as { signedUrl: string };
      await startVoice(data.signedUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start voice chat";
      setError(errorMessage);
    } finally {
      setVoiceLoading(false);
    }
  }, [voiceActive, voiceConnected, tokens?.accessToken, stopVoice, startVoice]);

  // Load chat history from database on mount
  useEffect(() => {
    if (!tokens?.accessToken) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`${API_URL}/chatbot/history?limit=50`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });

        if (response.ok) {
          const data = (await response.json()) as {
            messages: Array<{ role: "user" | "assistant"; content: string; timestamp: string }>;
          };

          if (data.messages.length > 0) {
            // Convert database messages to UI format
            const loadedMessages: ChatMessage[] = data.messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages(loadedMessages);
          } else {
            // Show welcome message if no history
            setMessages([
              {
                role: "assistant",
                content:
                  "Hi! I'm **Printly Assistant**. I can help you navigate the platform, explain features, or answer questions about designs, orders, and more. How can I help you today?",
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        // Show welcome message on error
        setMessages([
          {
            role: "assistant",
            content:
              "Hi! I'm **Printly Assistant**. I can help you navigate the platform, explain features, or answer questions about designs, orders, and more. How can I help you today?",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [tokens?.accessToken]);

  // Load available models on mount
  useEffect(() => {
    if (!tokens?.accessToken) return;

    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch(`${API_URL}/chatbot/models`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });

        if (response.ok) {
          const data = (await response.json()) as { models: AIModel[] };
          setModels(data.models);

          // Load saved model preference from localStorage
          const savedModel = localStorage.getItem("printly-chatbot-model");
          if (savedModel) {
            if (data.models.some((m) => m.id === savedModel)) {
              setSelectedModel(savedModel);
            } else {
              // Saved model is no longer available on the server; remove it and fall back to default
              localStorage.removeItem("printly-chatbot-model");
              const defaultModel = data.models.find((m) => m.isDefault);
              if (defaultModel) setSelectedModel(defaultModel.id);
            }
          } else {
            // Use default model
            const defaultModel = data.models.find((m) => m.isDefault);
            if (defaultModel) {
              setSelectedModel(defaultModel.id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [tokens?.accessToken]);

  // Save model preference to localStorage when changed
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem("printly-chatbot-model", selectedModel);
    }
  }, [selectedModel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Close model menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isModelMenuOpen && !target.closest(".model-dropdown-container")) {
        setIsModelMenuOpen(false);
      }
    };

    if (isModelMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isModelMenuOpen]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !tokens?.accessToken) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    // Add user message
    const newUserMessage: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Prepare history (excluding welcome message and error messages)
      const history = messages
        .filter((m) => !m.error && messages.indexOf(m) > 0) // Skip welcome message
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch(`${API_URL}/chatbot/message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          history: history.slice(-10), // Keep last 10 messages for context
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { message: string; actions?: ToolAction[] };

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          actions: data.actions,
        },
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);

      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${errorMessage}`,
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, tokens?.accessToken, messages]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return formatMessageTime(date);
  };

  // Don't render if not authenticated
  if (!tokens?.accessToken) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105"
          onClick={() => setIsOpen(true)}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Open chat</span>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed right-6 bottom-6 z-50 flex flex-col rounded-lg border bg-background shadow-2xl transition-all duration-200",
            isMinimized ? "h-14 w-80" : "h-[600px] max-h-[85vh] w-[420px] max-w-[calc(100vw-2rem)]",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-lg border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">Printly Assistant</span>
              {voiceActive && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium text-[10px]",
                    isListening
                      ? "bg-green-500/20 text-green-100"
                      : isSpeaking
                        ? "bg-blue-500/20 text-blue-100"
                        : "bg-primary-foreground/20 text-primary-foreground",
                  )}
                >
                  {isListening ? "Listening" : isSpeaking ? "Speaking" : "Ready"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsMinimized(!isMinimized)}
                size="icon-sm"
                variant="ghost"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
                size="icon-sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
                <div className="space-y-4 pb-2">
                  {messages.map((message, index) => (
                    <div
                      className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                      key={index}
                    >
                      {message.role === "assistant" && (
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            message.error ? "bg-destructive/10" : "bg-primary/10",
                          )}
                        >
                          {message.error ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Bot className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.error
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted",
                        )}
                      >
                        {message.role === "user" ? (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                // Style inline code
                                code: ({ className, children, ...props }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="rounded bg-muted/50 px-1 py-0.5 font-mono text-xs" {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <code className={cn("text-xs", className)} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                // Style code blocks
                                pre: ({ children }) => (
                                  <pre className="my-2 overflow-x-auto rounded-md bg-muted/50 p-2 text-xs">
                                    {children}
                                  </pre>
                                ),
                                // Style lists
                                ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                                // Style paragraphs
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                // Style links
                                a: ({ href, children }) => (
                                  <a
                                    className="text-primary underline hover:no-underline"
                                    href={href}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                  >
                                    {children}
                                  </a>
                                ),
                                // Style strong/bold
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              }}
                              remarkPlugins={[remarkGfm]}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        {/* Render action cards for tool executions */}
                        {message.actions && message.actions.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.actions.map((action, actionIdx) => (
                              <div
                                className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2"
                                key={actionIdx}
                              >
                                {action.type === "create_support_ticket" && (
                                  <>
                                    <TicketCheck className="h-4 w-4 shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-xs">Support ticket created</p>
                                      {action.subject && (
                                        <p className="truncate text-muted-foreground text-xs">{action.subject}</p>
                                      )}
                                    </div>
                                    <a
                                      className="shrink-0 text-primary hover:text-primary/80"
                                      href="/chat"
                                      title="Open Chat"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p
                          className={cn(
                            "mt-1 text-xs opacity-70",
                            message.role === "user" ? "text-right" : "text-left",
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Voice active indicators */}
                  {voiceActive && isListening && (
                    <div className="flex justify-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                        <Mic className="h-4 w-4 animate-pulse text-green-500" />
                      </div>
                      <div className="rounded-2xl bg-green-500/10 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 text-sm dark:text-green-400">Listening...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {voiceActive && isSpeaking && (
                    <div className="flex justify-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <AudioLines className="h-4 w-4 animate-pulse text-blue-500" />
                      </div>
                      <div className="rounded-2xl bg-blue-500/10 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 text-sm dark:text-blue-400">AI is speaking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="rounded-2xl bg-muted px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Error banner */}
              {error && (
                <div className="border-destructive/20 border-t bg-destructive/10 px-4 py-2">
                  <p className="text-destructive text-xs">{error}</p>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    className="max-h-[100px] min-h-[40px] resize-none"
                    disabled={isLoading}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    ref={textareaRef}
                    rows={1}
                    value={inputValue}
                  />
                  {models.length > 0 && (
                    <div className="model-dropdown-container relative">
                      <Button
                        className="shrink-0"
                        disabled={isLoading || isLoadingModels}
                        onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        size="icon"
                        title="Change AI Model"
                        variant="outline"
                      >
                        <Cpu className="h-4 w-4" />
                      </Button>
                      {isModelMenuOpen && (
                        <div className="absolute right-0 bottom-full z-50 mb-2 w-56 rounded-lg border border-input bg-popover shadow-lg">
                          <div className="p-3">
                            <p className="mb-2 font-semibold text-muted-foreground text-xs">AI Model</p>
                            <div className="max-h-64 space-y-1 overflow-y-auto">
                              {models.map((model) => (
                                <button
                                  className={cn(
                                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                                    selectedModel === model.id
                                      ? "bg-primary text-primary-foreground"
                                      : "text-foreground hover:bg-muted",
                                  )}
                                  key={model.id}
                                  onClick={() => {
                                    setSelectedModel(model.id);
                                    setIsModelMenuOpen(false);
                                  }}
                                >
                                  <div className="font-medium">{model.displayName}</div>
                                  <div className="line-clamp-2 text-xs opacity-70">{model.description}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    className="shrink-0"
                    disabled={voiceLoading || isLoading}
                    onClick={toggleVoice}
                    size="icon"
                    title={voiceActive ? "Stop voice chat" : "Start voice chat"}
                    variant={voiceActive ? "destructive" : "outline"}
                  >
                    {voiceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : voiceActive ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    className="shrink-0"
                    disabled={!inputValue.trim() || isLoading}
                    onClick={sendMessage}
                    size="icon"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-2 text-center text-muted-foreground text-xs">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
