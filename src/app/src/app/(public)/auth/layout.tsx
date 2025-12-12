"use client";

import LoadingSpinner from "@/components/loading-spinner";
import { useAuth } from "@/lib/providers/auth";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { claims } = useAuth();

  if (claims?.role) {
    router.push("/dashboard");
    return <LoadingSpinner className={"h-dvh"} />;
  }

  return children;
}
