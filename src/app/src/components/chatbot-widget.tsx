"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/providers/auth";
import { API_URL } from "@/environment";
import { MessageCircle, X, Send, Bot, User, Loader2, AlertCircle, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ModelSelector } from "@/components/chatbot/model-selector";
import type { AIModel } from "@/lib/server/chatbot";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus textarea when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isMinimized]);

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

      const data = (await response.json()) as { message: string };

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
          onClick={() => setIsOpen(true)}
          className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105"
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
            "bg-background fixed right-6 bottom-6 z-50 flex flex-col rounded-lg border shadow-2xl transition-all duration-200",
            isMinimized ? "h-14 w-80" : "h-[600px] max-h-[85vh] w-[420px]",
          )}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground flex items-center justify-between rounded-t-lg border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">Printly Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4 pb-2">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {message.role === "assistant" && (
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            message.error ? "bg-destructive/10" : "bg-primary/10",
                          )}
                        >
                          {message.error ? (
                            <AlertCircle className="text-destructive h-4 w-4" />
                          ) : (
                            <Bot className="text-primary h-4 w-4" />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.error
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted",
                        )}
                      >
                        {message.role === "user" ? (
                          <p className="break-words whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Style inline code
                                code: ({ className, children, ...props }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="bg-muted/50 rounded px-1 py-0.5 font-mono text-xs" {...props}>
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
                                  <pre className="bg-muted/50 my-2 overflow-x-auto rounded-md p-2 text-xs">
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
                                    href={href}
                                    className="text-primary underline hover:no-underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                  </a>
                                ),
                                // Style strong/bold
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
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
                        <div className="bg-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start gap-3">
                      <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <Bot className="text-primary h-4 w-4" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Error banner */}
              {error && (
                <div className="bg-destructive/10 border-destructive/20 border-t px-4 py-2">
                  <p className="text-destructive text-xs">{error}</p>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-4">
                {/* Model selector */}
                {models.length > 0 && (
                  <div className="mb-3">
                    <ModelSelector
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      models={models}
                      isLoading={isLoadingModels}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="max-h-[100px] min-h-[40px] resize-none"
                    rows={1}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className="shrink-0"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-muted-foreground mt-2 text-center text-xs">
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
