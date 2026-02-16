"use server";

import { API_URL, ENVIRONMENT } from "@/environment";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type ServerRequest = {
  method?: string;
  headers?: [string, string][];
  body?: BodyInit | null;
};

export type ServerRespoonse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  bodyBase64: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

export async function fetchServer(endpoint: string, init?: ServerRequest): Promise<ServerRespoonse> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const requestInit: RequestInit = {
    method: init?.method,
    headers: init?.headers,
    body: init?.body ?? null,
  };

  let response: Response;

  if (ENVIRONMENT === "production") {
    const { env } = getCloudflareContext();

    if (env.SERVER) {
      response = await env.SERVER.fetch(`${normalizedEndpoint}`, requestInit);
    } else {
      response = await fetch(`${API_URL}${normalizedEndpoint}`, requestInit);
    }
  } else {
    response = await fetch(`${API_URL}${normalizedEndpoint}`, requestInit);
  }

  const buffer = await response.arrayBuffer();
  const bodyBase64 = bytesToBase64(new Uint8Array(buffer));

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
    bodyBase64,
  };
}
