"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/(tools)/designer/")({
  component: Page,
});

function Page() {
  const navigate = useNavigate();

  // Redirect to the new designer with [id] route
  useEffect(() => {
    navigate({ to: "/designer/new", replace: true });
  }, [navigate]);

  return (
    <div className={"flex h-dvh w-dvw items-center justify-center"}>
      <div className={"flex flex-col items-center gap-2"}>
        <div className={"border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"} />
        <span className={"text-muted-foreground text-sm"}>Loading designer...</span>
      </div>
    </div>
  );
}
