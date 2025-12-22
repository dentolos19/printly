"use client";

import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import generateServerFunctions from "@/lib/server";
import { ServerFetch, ServerFunctions } from "@/types";
import { createContext, useContext } from "react";

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
  const { tokens } = useAuth();

  const fetch = async (endpoint: string, init?: RequestInit): Promise<Response> => {
    return await globalThis.fetch(`${API_URL}${endpoint}`, {
      ...init,
      credentials: "include",
      headers: {
        ...init?.headers,
        ...(tokens && { Authorization: `Bearer ${tokens.accessToken}` }),
      },
    });
  };

  const api = generateServerFunctions(fetch);

  return <ServerContext.Provider value={{ fetch, api }}>{children}</ServerContext.Provider>;
}
