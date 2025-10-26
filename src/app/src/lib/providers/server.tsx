"use client";

import { useAuth } from "@/lib/providers/auth";
import { createContext, useContext } from "react";

const ServerContext = createContext<{
  fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}>({
  fetch: async () => {
    return new Response();
  },
});

export function useServer() {
  return useContext(ServerContext);
}

export default function ServerProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();

  const fetch = async (info: RequestInfo, init?: RequestInit): Promise<Response> => {
    return await fetch(info, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: auth ? `Bearer ${auth.userToken}` : "",
      },
    });
  };

  return <ServerContext.Provider value={{ fetch }}>{children}</ServerContext.Provider>;
}