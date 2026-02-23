"use client";

import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import { useBackendReadiness } from "@/lib/providers/backend-readiness";
import generateServerFunctions from "@/lib/server";
import { ServerFetch, ServerFunctions } from "@/types";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

const RETRYABLE_BACKEND_STATUS = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526]);

const ServerContext = createContext<{
  fetch: ServerFetch;
  api: ServerFunctions;
}>({
  fetch: async () => new Response(),
  api: generateServerFunctions(async () => new Response()),
});

export function useServer() {
  return useContext(ServerContext);
}

export default function ServerProvider({ children }: { children: React.ReactNode }) {
  const { tokens, refreshAccess, logout } = useAuth();
  const { markUnavailable, reportResponse, waitUntilReady } = useBackendReadiness();
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<void> | null>(null);

  const normalizeHeaders = (headers?: HeadersInit): [string, string][] => {
    if (!headers) {
      return [];
    }

    if (headers instanceof Headers) {
      return Array.from(headers.entries());
    }

    if (Array.isArray(headers)) {
      return headers;
    }

    return Object.entries(headers);
  };

  const requestWithAuth = useCallback(
    async (
      endpoint: string,
      init?: RequestInit,
      retryAuth = true,
      accessTokenOverride?: string,
      retryWhenBackendReady = true,
    ): Promise<Response> => {
      const headers = normalizeHeaders(init?.headers);
      const accessToken = accessTokenOverride ?? tokens?.accessToken;
      const authHeaders = accessToken ? [["Authorization", `Bearer ${accessToken}`] as [string, string]] : [];
      let response: Response;

      try {
        response = await globalThis.fetch(`${API_URL}${endpoint}`, {
          ...init,
          headers: [...headers, ...authHeaders],
        });
      } catch (error) {
        markUnavailable();

        if (retryWhenBackendReady) {
          await waitUntilReady();
          return requestWithAuth(endpoint, init, retryAuth, accessTokenOverride, false);
        }

        throw error;
      }

      reportResponse(response);

      if (RETRYABLE_BACKEND_STATUS.has(response.status) && retryWhenBackendReady) {
        markUnavailable();
        await waitUntilReady();
        return requestWithAuth(endpoint, init, retryAuth, accessTokenOverride, false);
      }

      // Handle 401 Unauthorized - attempt token refresh and retry
      if (response.status === 401 && retryAuth && tokens?.refreshToken) {
        try {
          // If already refreshing, wait for that refresh to complete
          if (isRefreshing.current && refreshPromise.current) {
            await refreshPromise.current;
          } else {
            // Start new refresh
            isRefreshing.current = true;
            refreshPromise.current = refreshAccess();

            try {
              await refreshPromise.current;
            } finally {
              isRefreshing.current = false;
              refreshPromise.current = null;
            }
          }

          // Retry the original request with new token (retry=false to prevent infinite loop)
          const refreshedAccessToken = localStorage.getItem("accessToken") || undefined;
          return requestWithAuth(endpoint, init, false, refreshedAccessToken, retryWhenBackendReady);
        } catch (error) {
          // Refresh failed, log out user
          console.error("Token refresh failed:", error);
          logout();
          throw new Error("Session expired");
        }
      }

      return response;
    },
    [logout, markUnavailable, refreshAccess, reportResponse, tokens?.accessToken, tokens?.refreshToken, waitUntilReady],
  );

  const fetch = useCallback<ServerFetch>(
    (endpoint: string, init?: RequestInit) => {
      return requestWithAuth(endpoint, init);
    },
    [requestWithAuth],
  );

  const api = useMemo(() => generateServerFunctions(fetch), [fetch]);
  const value = useMemo(() => ({ fetch, api }), [fetch, api]);

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}
