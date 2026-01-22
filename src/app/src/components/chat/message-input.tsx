"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CornerUpLeft, Send, X } from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

export interface ReplyInfo {
  messageId: string;
  senderName: string;
  content: string;
}

export interface MessageInputProps {
  onSend: (content: string, replyToMessageId?: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: ReplyInfo | null;
  onCancelReply?: () => void;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    { onSend, onTypingStart, onTypingStop, disabled, placeholder = "Type a message...", replyTo, onCancelReply },
    ref,
  ) => {
    const [content, setContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const handleTyping = useCallback(() => {
      if (!isTyping) {
        setIsTyping(true);
        onTypingStart?.();
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTypingStop?.();
      }, 3000);
    }, [isTyping, onTypingStart, onTypingStop]);

    const handleSend = useCallback(() => {
      if (!content.trim() || disabled) return;

      onSend(content.trim(), replyTo?.messageId);
      setContent("");
      onCancelReply?.();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        setIsTyping(false);
        onTypingStop?.();
      }
    }, [content, disabled, onSend, replyTo, onCancelReply, isTyping, onTypingStop]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      handleTyping();
    };

    useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (replyTo && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [replyTo, textareaRef]);

    return (
      <div className="bg-background border-t p-4">
        {replyTo && (
          <div className="border-l-primary bg-muted/50 mb-2 flex items-center gap-2 rounded-lg border-l-2 px-3 py-2">
            <CornerUpLeft className="text-muted-foreground h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-primary text-xs font-medium">Replying to {replyTo.senderName}</span>
              <p className="text-muted-foreground truncate text-xs">{replyTo.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancelReply}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="max-h-[120px] min-h-[44px] resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  },
);

MessageInput.displayName = "MessageInput";
