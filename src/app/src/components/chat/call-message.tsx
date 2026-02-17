"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Clock,
  FileText,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Video,
  X,
  AlertCircle,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// Call status enum matching backend
export enum CallStatus {
  Ringing = 0,
  Ongoing = 1,
  Completed = 2,
  Missed = 3,
  Declined = 4,
  Failed = 5,
}

// Call type enum matching backend
export enum CallTypeEnum {
  Audio = 0,
  Video = 1,
}

export interface CallMessageProps {
  content: string;
  callLogId: string;
  senderName: string;
  isCurrentUser: boolean;
  createdAt: string;
  // New structured call data
  callType?: CallTypeEnum | null;
  callStatus?: CallStatus | null;
  callDurationSeconds?: number | null;
  callInitiatorId?: string | null;
  callInitiatorName?: string | null;
  // Actions
  onJoinCall?: () => void;
  onAnswerCall?: () => void;
  onDeclineCall?: () => void;
  canJoinCall?: boolean;
  isRinging?: boolean;
  isInCall?: boolean;
  // AI Call Notes is only available on completed calls
  showAiCallNotes?: boolean;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function getStatusConfig(status: CallStatus | null | undefined) {
  switch (status) {
    case CallStatus.Ringing:
      return {
        icon: PhoneIncoming,
        label: "Ringing",
        color: "text-primary",
        bgColor: "bg-primary/15",
        badgeBg: "bg-blue-100 dark:bg-blue-900/30",
        badgeText: "text-blue-700 dark:text-blue-400",
        isActive: true,
      };
    case CallStatus.Ongoing:
      return {
        icon: Phone,
        label: "Active",
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        badgeBg: "bg-green-100 dark:bg-green-900/30",
        badgeText: "text-green-700 dark:text-green-400",
        isActive: true,
      };
    case CallStatus.Completed:
      return {
        icon: PhoneOff,
        label: "Ended",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        badgeBg: "bg-gray-100 dark:bg-gray-800",
        badgeText: "text-gray-700 dark:text-gray-400",
        isActive: false,
      };
    case CallStatus.Missed:
      return {
        icon: PhoneMissed,
        label: "Missed",
        color: "text-orange-500",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        badgeBg: "bg-orange-100 dark:bg-orange-900/30",
        badgeText: "text-orange-700 dark:text-orange-400",
        isActive: false,
      };
    case CallStatus.Declined:
      return {
        icon: X,
        label: "Declined",
        color: "text-red-500",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        badgeBg: "bg-red-100 dark:bg-red-900/30",
        badgeText: "text-red-700 dark:text-red-400",
        isActive: false,
      };
    case CallStatus.Failed:
      return {
        icon: AlertCircle,
        label: "Failed",
        color: "text-red-500",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        badgeBg: "bg-red-100 dark:bg-red-900/30",
        badgeText: "text-red-700 dark:text-red-400",
        isActive: false,
      };
    default:
      // Fallback for unknown status - treat as ongoing
      return {
        icon: Phone,
        label: "Call",
        color: "text-primary",
        bgColor: "bg-primary/15",
        badgeBg: "bg-blue-100 dark:bg-blue-900/30",
        badgeText: "text-blue-700 dark:text-blue-400",
        isActive: true,
      };
  }
}

// Dialog for displaying AI-generated call notes
function AiCallNotesDialog({
  callLogId,
  isOpen,
  onClose,
}: {
  callLogId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { tokens } = useAuth();
  const [notes, setNotes] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isOpen || hasFetched.current || !tokens?.accessToken) return;

    const fetchNotes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/conversation/call/${callLogId}/notes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to generate notes");
        }

        const data = (await response.json()) as {
          notes: string;
          transcript: string;
          wasGenerated: boolean;
        };

        setNotes(data.notes);
        setTranscript(data.transcript);
        hasFetched.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [isOpen, callLogId, tokens?.accessToken]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI Call Notes
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Generating call notes...</p>
            <p className="text-muted-foreground text-xs">This may take a moment on first use</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Notes section */}
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-semibold tracking-wide uppercase">Notes</h4>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{notes}</div>
              </div>

              {/* Transcript collapsible */}
              {transcript && (
                <div className="border-t pt-4 pb-4">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-sm font-semibold tracking-wide uppercase transition-colors"
                  >
                    <span>Transcript</span>
                    {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showTranscript && (
                    <div className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert mt-3 text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                          em: ({ node, ...props }) => <em className="italic" {...props} />,
                        }}
                      >
                        {transcript}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CallMessage({
  content,
  callLogId,
  senderName,
  isCurrentUser,
  createdAt,
  callType,
  callStatus,
  callDurationSeconds,
  callInitiatorId,
  callInitiatorName,
  onJoinCall,
  onAnswerCall,
  onDeclineCall,
  canJoinCall = false,
  isRinging = false,
  isInCall = false,
  showAiCallNotes = false,
}: CallMessageProps) {
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const isVideo = callType === CallTypeEnum.Video;
  const statusConfig = getStatusConfig(callStatus);
  const StatusIcon = statusConfig.icon;
  const CallTypeIcon = isVideo ? Video : Phone;
  const duration = formatDuration(callDurationSeconds);
  const isActive = statusConfig.isActive;

  // Determine who initiated - use callInitiatorName if available, else fallback to sender
  const initiatorDisplay = callInitiatorName || senderName;
  const wasInitiatedByCurrentUser = isCurrentUser || (callInitiatorId && callInitiatorName === senderName);

  return (
    <div className="my-2 flex justify-center px-2">
      <div
        className={cn(
          "flex w-full max-w-sm flex-col items-center gap-2 rounded-xl border-2 p-3 shadow-sm",
          isActive
            ? "border-primary/40 bg-primary/5"
            : callStatus === CallStatus.Declined || callStatus === CallStatus.Missed || callStatus === CallStatus.Failed
              ? "border-destructive/40 bg-destructive/5"
              : "border-muted bg-muted/20",
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            statusConfig.bgColor,
            statusConfig.color,
          )}
        >
          <CallTypeIcon className={cn("h-6 w-6", isActive && "animate-pulse")} />
        </div>

        {/* Call Type Title */}
        <p className="font-semibold">{isVideo ? "Video Call" : "Voice Call"}</p>

        {/* Initiator Info */}
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <User className="h-3 w-3" />
          <span>{wasInitiatedByCurrentUser ? "You" : initiatorDisplay} started the call</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusConfig.badgeBg,
              statusConfig.badgeText,
            )}
          >
            {isActive && (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  callStatus === CallStatus.Ongoing ? "animate-pulse bg-green-500" : "animate-pulse bg-blue-500",
                )}
              />
            )}
            <StatusIcon className="h-3 w-3" />
            {isInCall ? "In Call" : statusConfig.label}
          </span>
        </div>

        {/* Duration (for completed calls) */}
        {duration && (
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            <span>Duration: {duration}</span>
          </div>
        )}

        {/* AI Call Notes button - only for completed calls */}
        {showAiCallNotes && callStatus === CallStatus.Completed && callLogId && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5 text-xs"
              onClick={() => setNotesDialogOpen(true)}
            >
              <FileText className="h-3.5 w-3.5" />
              AI Call Notes
            </Button>
            <AiCallNotesDialog
              callLogId={callLogId}
              isOpen={notesDialogOpen}
              onClose={() => setNotesDialogOpen(false)}
            />
          </>
        )}

        {/* Action Buttons */}
        {isActive && !isInCall && (
          <div className="flex w-full flex-col gap-1.5 pt-1">
            {/* Answer/Decline buttons for incoming calls */}
            {isRinging && onAnswerCall && onDeclineCall && (
              <div className="flex gap-2">
                <Button onClick={onDeclineCall} variant="destructive" size="sm" className="flex-1 gap-1.5">
                  <PhoneOff className="h-3.5 w-3.5" />
                  Decline
                </Button>
                <Button onClick={onAnswerCall} size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700">
                  {isVideo ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                  Answer
                </Button>
              </div>
            )}

            {/* Join button for active calls */}
            {!isRinging && canJoinCall && onJoinCall && (
              <Button onClick={onJoinCall} size="sm" className="w-full gap-1.5 bg-green-600 hover:bg-green-700">
                {isVideo ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                Join Call
              </Button>
            )}
          </div>
        )}

        {/* In call indicator */}
        {isInCall && <div className="text-primary text-xs font-medium">You are in this call</div>}

        {/* Timestamp */}
        <p className="text-muted-foreground text-[10px]">{formatTime(createdAt)}</p>
      </div>
    </div>
  );
}
