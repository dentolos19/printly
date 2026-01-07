"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageReplyPreviewProps {
  replyToMessage: {
    senderName: string;
    content: string;
  };
  onCancel: () => void;
}

export function MessageReplyPreview({ replyToMessage, onCancel }: MessageReplyPreviewProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-l-4 border-primary rounded-sm">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary truncate">
          Replying to {replyToMessage.senderName}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {replyToMessage.content}
        </p>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onCancel} className="shrink-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
