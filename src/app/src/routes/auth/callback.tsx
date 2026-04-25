"use client";

import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import Loading from "#/components/loading";
import { useAuth } from "#/lib/providers/auth";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, string | undefined>;
  const auth = useAuth();

  useEffect(() => {
    if (auth.tokens) {
      navigate({ to: "/dashboard" });
      return;
    }

    const accessToken = search["accessToken"];
    const refreshToken = search["refreshToken"];

    if (accessToken && refreshToken) {
      auth.loginWithToken(accessToken, refreshToken);
      toast.success("Logged in successfully with Google!");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Failed to login with Google!");
      navigate({ to: "/auth" });
    }
  }, [search, auth, navigate]);

  return (
    <div className={"h-dvh"}>
      <Loading />
    </div>
  );
}
