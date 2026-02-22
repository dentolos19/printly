"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CornerUpLeft, File, Paperclip, Send, X } from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

export interface ReplyInfo {
  messageId: string;
  senderName: string;
  content: string;
}

export interface FileUploadInfo {
  file: File;
  preview?: string;
}

export interface MessageInputProps {
  onSend: (content: string, replyToMessageId?: string) => void;
  onSendFile?: (file: File, content: string, replyToMessageId?: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: ReplyInfo | null;
  onCancelReply?: () => void;
  allowFileUpload?: boolean;
  maxFileSizeMB?: number;
  acceptedFileTypes?: string;
}

const ACCEPTED_FILE_TYPES = "image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt";

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    {
      onSend,
      onSendFile,
      onTypingStart,
      onTypingStop,
      disabled,
      placeholder = "Type a message...",
      replyTo,
      onCancelReply,
      allowFileUpload = true,
      maxFileSizeMB = 50,
      acceptedFileTypes = ACCEPTED_FILE_TYPES,
    },
    ref,
  ) => {
    const [content, setContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const clearInput = useCallback(() => {
      setContent("");
      setSelectedFile(null);
      setFilePreview(null);
      onCancelReply?.();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        setIsTyping(false);
        onTypingStop?.();
      }
    }, [isTyping, onTypingStop, onCancelReply]);

    const handleSend = useCallback(() => {
      if (disabled) return;

      // Send file with optional message
      if (selectedFile && onSendFile) {
        onSendFile(selectedFile, content.trim(), replyTo?.messageId);
        clearInput();
        return;
      }

      // Send text message
      if (content.trim()) {
        onSend(content.trim(), replyTo?.messageId);
        clearInput();
      }
    }, [content, disabled, onSend, onSendFile, selectedFile, replyTo, clearInput]);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check file size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        alert(`File size must be less than ${maxFileSizeMB}MB`);
        return;
      }

      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const clearSelectedFile = () => {
      setSelectedFile(null);
      setFilePreview(null);
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

    const canSend = content.trim() || selectedFile;

    return (
      <div className="bg-background border-t p-4">
        {replyTo && (
          <div className="border-l-primary bg-muted/50 mb-3 flex items-center gap-2 rounded-lg border-l-2 px-3 py-2">
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

        {selectedFile && (
          <div className="bg-muted/50 mb-3 flex items-center gap-2 rounded-lg px-3 py-2">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded">
                <File className="text-muted-foreground h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selectedFile.name}</p>
              <p className="text-muted-foreground text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearSelectedFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {allowFileUpload && onSendFile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="max-h-[120px] min-h-[44px] resize-none rounded-xl"
            rows={1}
          />

          {canSend && (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={disabled}
              className="h-10 w-10 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    );
  },
);

MessageInput.displayName = "MessageInput";
