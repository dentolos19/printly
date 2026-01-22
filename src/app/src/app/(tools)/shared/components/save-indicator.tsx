/**
 * Shared save status indicator component
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Cloud, Loader2 } from "lucide-react";
import type { SaveStatus } from "../hooks/use-auto-save";

type SaveIndicatorProps = {
  status: SaveStatus;
  lastSavedAt: Date | null;
  isDirty: boolean;
};

export function SaveIndicator({ status, lastSavedAt, isDirty }: SaveIndicatorProps) {
  const saveStatusIcon = {
    idle: null,
    saving: <Loader2 className="h-3 w-3 animate-spin" />,
    saved: <Cloud className="h-3 w-3" />,
    error: <AlertTriangle className="text-destructive h-3 w-3" />,
  };

  const saveStatusText = {
    idle: "Not saved",
    saving: "Saving...",
    saved: lastSavedAt ? formatLastSaved(lastSavedAt) : "Saved",
    error: "Error saving",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          {saveStatusIcon[status]}
          <span>{saveStatusText[status]}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{isDirty ? "Unsaved changes" : "All changes saved"}</TooltipContent>
    </Tooltip>
  );
}

function formatLastSaved(lastSavedAt: Date): string {
  const now = new Date();
  const diff = now.getTime() - lastSavedAt.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  return lastSavedAt.toLocaleTimeString();
}
