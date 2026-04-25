"use client";

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
