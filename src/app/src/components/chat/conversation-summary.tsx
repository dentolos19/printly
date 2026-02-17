"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/environment";
import type { ConversationSummaryResponse } from "@/lib/server/conversation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface ConversationSummaryProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  authorizedFetch: (endpoint: string, init?: RequestInit) => Promise<Response>;
}

const SENTIMENT_CONFIG = {
  positive: {
    emoji: "😊",
    label: "Positive",
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    icon: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  neutral: {
    emoji: "😐",
    label: "Neutral",
    color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800",
    icon: "bg-sky-100 dark:bg-sky-900/50",
  },
  negative: {
    emoji: "😟",
    label: "Negative",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    icon: "bg-amber-100 dark:bg-amber-900/50",
  },
} as const;

export function ConversationSummary({ conversationId, isOpen, onClose, authorizedFetch }: ConversationSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const response = await authorizedFetch(`${API_URL}/conversation/${conversationId}/summary`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }
      const data: ConversationSummaryResponse = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, authorizedFetch]);

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, fetchSummary]);

  const sentimentInfo = summary ? (SENTIMENT_CONFIG[summary.sentiment] ?? SENTIMENT_CONFIG.neutral) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] flex-col p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="text-primary h-5 w-5" />
            AI Summary
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-hidden px-5">
          <div className="space-y-3">
            {isLoading && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertTriangle className="text-destructive h-10 w-10 opacity-70" />
                <div>
                  <p className="text-destructive font-medium">Failed to generate summary</p>
                  <p className="text-muted-foreground mt-1 text-sm">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSummary}>
                  Try again
                </Button>
              </div>
            )}

            {summary && (
              <div className="space-y-3">
                {/* Summary */}
                <div>
                  <h4 className="text-foreground mb-1 text-xs font-semibold tracking-tight uppercase">Summary</h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">{summary.summary}</p>
                </div>

                {/* Conversation Overview */}
                <div>
                  <h4 className="text-foreground mb-1.5 text-xs font-semibold tracking-tight uppercase">Overview</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-muted/50 flex items-center gap-2 rounded-md p-2">
                      <MessageSquare className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-xs">Messages</p>
                        <p className="text-xs font-semibold">{summary.messageCount}</p>
                      </div>
                    </div>
                    <div className="bg-muted/50 flex items-center gap-2 rounded-md p-2">
                      <Clock className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-muted-foreground text-xs">Duration</p>
                        <p className="text-xs font-semibold">
                          {summary.durationMinutes < 1 ? "<1 min" : `${summary.durationMinutes} min`}
                        </p>
                      </div>
                    </div>
                    <div className="bg-muted/50 flex items-center gap-2 rounded-md p-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${sentimentInfo?.icon}`}>
                        <span className="text-base">{sentimentInfo?.emoji}</span>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Sentiment</p>
                        <p className="text-xs font-semibold">{sentimentInfo?.label}</p>
                      </div>
                    </div>
                    <div className="bg-muted/50 flex items-center gap-2 rounded-md p-2">
                      {summary.resolved ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Status</p>
                        <p className="text-xs font-semibold">{summary.resolved ? "Resolved" : "Unresolved"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Discussion Points */}
                {summary.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-foreground mb-1 flex items-center gap-1 text-xs font-semibold tracking-tight uppercase">
                      <Lightbulb className="h-3 w-3" />
                      Key Points
                    </h4>
                    <ul className="space-y-0.5">
                      {summary.keyPoints.map((point, i) => (
                        <li key={i} className="text-muted-foreground flex items-start gap-1.5 text-xs">
                          <span className="bg-primary mt-1 h-1 w-1 shrink-0 rounded-full" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {summary.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-foreground mb-1 flex items-center gap-1 text-xs font-semibold tracking-tight uppercase">
                      <ListChecks className="h-3 w-3" />
                      Actions
                    </h4>
                    <ul className="space-y-0.5 pb-2">
                      {summary.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-auto border-t px-5 py-3">
          <Button variant="outline" onClick={onClose} className="h-8 w-full text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
