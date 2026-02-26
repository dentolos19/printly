"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to chat page with the same query parameters
    const conversationId = searchParams.get("conversation");
    if (conversationId) {
      router.replace(`/chat?conversation=${conversationId}`);
    } else {
      router.replace("/chat");
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to chat...</p>
    </div>
  );
}
