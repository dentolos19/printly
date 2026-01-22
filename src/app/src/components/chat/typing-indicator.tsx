"use client";

import { cn } from "@/lib/utils";

export interface TypingIndicatorProps {
  users: Array<{ userId: string; userName: string; isAdmin: boolean }>;
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const displayText =
    users.length === 1
      ? `${users[0].userName} is typing`
      : users.length === 2
        ? `${users[0].userName} and ${users[1].userName} are typing`
        : `${users[0].userName} and ${users.length - 1} others are typing`;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      <div className="flex gap-1">
        <span className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
        <span className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
        <span className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full" />
      </div>
      <span className="text-muted-foreground text-xs">{displayText}</span>
    </div>
  );
}
