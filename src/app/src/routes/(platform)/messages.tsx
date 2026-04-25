"use client";

import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

function MessagesPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, string | undefined>;

  useEffect(() => {
    // Redirect to chat page with the same query parameters
    const conversationId = search["conversation"];
    if (conversationId) {
      navigate({ to: "/chat", search: { conversation: conversationId } });
    } else {
      navigate({ to: "/chat" });
    }
  }, [navigate, search]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to chat...</p>
    </div>
  );
}

export const Route = createFileRoute("/(platform)/messages")({
  component: MessagesPage,
});
