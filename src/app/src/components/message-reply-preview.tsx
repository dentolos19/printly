"use client";

import { X } from "lucide-react";
import { Button } from "#/components/ui/button";

interface MessageReplyPreviewProps {
  replyToMessage: {
    senderName: string;
    content: string;
  };
  onCancel: () => void;
}

export function MessageReplyPreview({ replyToMessage, onCancel }: MessageReplyPreviewProps) {
  return (
    <div className="flex items-center gap-2 rounded-sm border-primary border-l-4 bg-muted/50 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-primary text-xs">Replying to {replyToMessage.senderName}</p>
        <p className="truncate text-muted-foreground text-sm">{replyToMessage.content}</p>
      </div>
      <Button className="shrink-0" onClick={onCancel} size="icon-sm" variant="ghost">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
