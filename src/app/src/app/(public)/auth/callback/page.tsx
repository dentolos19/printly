"use client";

import LoadingSpinner from "@/components/loading-spinner";
import { useAuth } from "@/lib/providers/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  useEffect(() => {
    if (auth.tokens) {
      router.push("/");
      return;
    }

    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken && refreshToken) {
      auth.loginWithToken(accessToken, refreshToken);
      toast.success("Logged in successfully with Google!");
      router.push("/");
    } else {
      toast.error("Failed to login with Google!");
      router.push("/auth");
    }
  }, [searchParams, auth, router]);

  return <LoadingSpinner className={"h-dvh"} />;
}
