"use client";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/providers/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

function LoadingDisplay() {
  return (
    <div className={"h-dvh grid place-items-center"}>
      <div className={"flex flex-col items-center gap-4"}>
        <Spinner />
        <p className={"text-muted-foreground"}>Completing Google Login...</p>
      </div>
    </div>
  );
}

function NestedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  useEffect(() => {
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

  return <LoadingDisplay />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingDisplay />}>
      <NestedPage />
    </Suspense>
  );
}