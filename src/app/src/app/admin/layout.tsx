"use client";

import AccessDenied from "@/components/access-denied";
import { useAuth } from "@/lib/providers/auth";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { claims } = useAuth();

  if (claims?.role !== "admin") {
    return <AccessDenied className={"h-dvh"} />;
  }

  return children;
}
