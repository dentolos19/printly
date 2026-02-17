"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CornerUpLeft, File, Mic, Paperclip, Send, Square, X } from "lucide-react";
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

export interface VoiceRecordingInfo {
  blob: Blob;
  duration: number;
}

export interface MessageInputProps {
  onSend: (content: string, replyToMessageId?: string) => void;
  onSendFile?: (file: File, content: string, replyToMessageId?: string) => void;
  onSendVoice?: (blob: Blob, duration: number, replyToMessageId?: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: ReplyInfo | null;
  onCancelReply?: () => void;
  allowFileUpload?: boolean;
  allowVoiceMessage?: boolean;
  maxFileSizeMB?: number;
  acceptedFileTypes?: string;
}

const ACCEPTED_FILE_TYPES = "image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt";
const MAX_RECORDING_SECONDS = 120;

function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    {
      onSend,
      onSendFile,
      onSendVoice,
      onTypingStart,
      onTypingStop,
      disabled,
      placeholder = "Type a message...",
      replyTo,
      onCancelReply,
      allowFileUpload = true,
      allowVoiceMessage = true,
      maxFileSizeMB = 50,
      acceptedFileTypes = ACCEPTED_FILE_TYPES,
    },
    ref,
  ) => {
    const [content, setContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingError, setRecordingError] = useState<string | null>(null);

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const recordingDurationRef = useRef(0);

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

    const startRecording = async () => {
      try {
        setRecordingError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
        });

        audioChunksRef.current = [];
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType,
          });

          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop());

          // Use the ref for duration since state may be stale in this closure
          const finalDuration = recordingDurationRef.current;
          if (onSendVoice && audioBlob.size > 0 && finalDuration > 0) {
            onSendVoice(audioBlob, finalDuration, replyTo?.messageId);
            onCancelReply?.();
          }

          setRecordingDuration(0);
          recordingDurationRef.current = 0;
        };

        mediaRecorder.start(100);
        setIsRecording(true);
        setRecordingDuration(0);

        // Start duration counter
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => {
            const next = prev >= MAX_RECORDING_SECONDS ? prev : prev + 1;
            recordingDurationRef.current = next;
            if (prev >= MAX_RECORDING_SECONDS) {
              stopRecording();
            }
            return next;
          });
        }, 1000);
      } catch (err) {
        console.error("Failed to start recording:", err);
        setRecordingError("Microphone access denied. Please allow microphone access.");
      }
    };

    const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        // Clear chunks before stopping so onstop doesn't send
        audioChunksRef.current = [];
        setRecordingDuration(0);
        recordingDurationRef.current = 0;
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      }
    }, [isRecording]);

    useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
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

        {recordingError && <div className="text-destructive mb-3 text-sm">{recordingError}</div>}

        {isRecording ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950/30">
            {/* Recording indicator */}
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {formatRecordingTime(recordingDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Cancel - discard the recording */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                      onClick={cancelRecording}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel recording</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Send - stop recording and send it */}
              <Button
                size="sm"
                onClick={stopRecording}
                className="gap-1.5 rounded-full bg-blue-600 px-4 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        ) : (
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

            {allowVoiceMessage && onSendVoice && !canSend && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={startRecording}
                      disabled={disabled}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Record voice message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

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
        )}
      </div>
    );
  },
);

MessageInput.displayName = "MessageInput";
