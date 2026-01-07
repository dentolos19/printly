"use client";

export function TypingIndicator({ userName }: { userName?: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 px-4 py-2 text-sm">
      <div className="flex gap-1">
        <span className="bg-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
        <span className="bg-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
        <span className="bg-primary h-2 w-2 animate-bounce rounded-full" />
      </div>
      <span>{userName || "User"} is typing...</span>
    </div>
  );
}
