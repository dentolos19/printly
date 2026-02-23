"use client";

import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import { useBackendReadiness } from "@/lib/providers/backend-readiness";
import generateServerFunctions from "@/lib/server";
import { ServerFetch, ServerFunctions } from "@/types";
import { createContext, useContext, useRef } from "react";

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
  const { markUnavailable, reportResponse } = useBackendReadiness();
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

  const fetch = async (endpoint: string, init?: RequestInit, retry = true): Promise<Response> => {
    const headers = normalizeHeaders(init?.headers);
    const authHeaders = tokens ? [["Authorization", `Bearer ${tokens.accessToken}`] as [string, string]] : [];
    let response: Response;

    try {
      response = await globalThis.fetch(`${API_URL}${endpoint}`, {
        ...init,
        headers: [...headers, ...authHeaders],
      });
    } catch (error) {
      markUnavailable();
      throw error;
    }

    reportResponse(response);

    // Handle 401 Unauthorized - attempt token refresh and retry
    if (response.status === 401 && retry && tokens?.refreshToken) {
      try {
        // If already refreshing, wait for that refresh to complete
        if (isRefreshing.current && refreshPromise.current) {
          await refreshPromise.current;
        } else {
          // Start new refresh
          isRefreshing.current = true;
          refreshPromise.current = refreshAccess();
          await refreshPromise.current;
          isRefreshing.current = false;
          refreshPromise.current = null;
        }

        // Retry the original request with new token (retry=false to prevent infinite loop)
        return fetch(endpoint, init, false);
      } catch (error) {
        // Refresh failed, log out user
        console.error("Token refresh failed:", error);
        logout();
        throw new Error("Session expired");
      }
    }

    return response;
  };

  const api = generateServerFunctions(fetch);

  return <ServerContext.Provider value={{ fetch, api }}>{children}</ServerContext.Provider>;
}
