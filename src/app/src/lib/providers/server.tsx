"use client";

import { API_URL } from "@/environment";
import { fetchServer } from "@/lib/actions/cloudflare";
import { useAuth } from "@/lib/providers/auth";
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
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<void> | null>(null);

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    if (!base64) {
      return new ArrayBuffer(0);
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  };

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

    const response: Response = await (process.env.NODE_ENV === "production"
      ? (() => {
          const body = init?.body ?? null;

          return fetchServer(endpoint, {
            method: init?.method,
            headers: [...headers, ...authHeaders],
            body,
          }).then((result) => {
            return new Response(base64ToArrayBuffer(result.bodyBase64), {
              status: result.status,
              statusText: result.statusText,
              headers: result.headers,
            });
          });
        })()
      : globalThis.fetch(`${API_URL}${endpoint}`, {
          ...init,
          headers: {
            ...init?.headers,
            ...(tokens && { Authorization: `Bearer ${tokens.accessToken}` }),
          },
        }));

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
