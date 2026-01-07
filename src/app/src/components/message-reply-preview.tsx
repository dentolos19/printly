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
    <div className="bg-muted/50 border-primary flex items-center gap-2 rounded-sm border-l-4 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-primary truncate text-xs font-medium">Replying to {replyToMessage.senderName}</p>
        <p className="text-muted-foreground truncate text-sm">{replyToMessage.content}</p>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onCancel} className="shrink-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
