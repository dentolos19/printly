"use client";

import { Spinner } from "@/components/ui/spinner";
import { useBackendReadiness } from "@/lib/providers/backend-readiness";

export default function BackendWaitOverlay() {
  const { isBlocked, status, retryInSeconds, attempts } = useBackendReadiness();

  if (!isBlocked) {
    return null;
  }

  const title = status === "checking" ? "Starting backend" : "Backend is still waking up";
  const subtitle =
    status === "checking"
      ? "Please wait while we connect to the server."
      : "You can continue once the backend has finished booting.";

  return (
    <div className="bg-background/85 fixed inset-0 z-120 flex items-center justify-center backdrop-blur-sm">
      <div
        aria-live="polite"
        className="bg-card text-card-foreground border-border flex w-[min(32rem,92vw)] flex-col items-center gap-3 rounded-xl border px-6 py-8 text-center shadow-lg"
      >
        <Spinner className="text-primary size-8" />
        <h2 className="text-lg font-semibold">{title}...</h2>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
        <p className="text-muted-foreground text-xs">
          Retrying in {retryInSeconds}s • Attempt {attempts}
        </p>
      </div>
    </div>
  );
}
