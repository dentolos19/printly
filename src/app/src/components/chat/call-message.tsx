"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, Phone, PhoneIncoming, PhoneMissed, PhoneOff, Video, X, AlertCircle, User } from "lucide-react";

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
}: CallMessageProps) {
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
