"use client";

import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(tools)")({
  ssr: false,
  component: ToolsLayout,
});

function ToolsLayout() {
  return <Outlet />;
}
