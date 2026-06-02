import { timingSafeEqual } from "node:crypto";

import { Container, getContainer } from "@cloudflare/containers";
import handler from "@tanstack/react-start/server-entry";

const PORT = 3001;

type AppEnv = Env & {
  SECRET_KEY?: string;
};

export class Server extends Container<AppEnv> {
  defaultPort = PORT;
  sleepAfter = "10m";
  envVars = Object.fromEntries(
    Object.entries(this.env).filter(([, value]) => typeof value === "string" && !!value),
  ) as Record<string, string>;
}

const proxy = (request: Request, url: URL, env: AppEnv) => {
  if (import.meta.env.DEV) {
    url.protocol = "http";
    url.host = `localhost:${PORT}`;
    return fetch(new Request(url.toString(), request));
  }

  return getContainer(env.SERVER, "singleton").fetch(new Request(url.toString(), request));
};

const hasStorageAccess = (request: Request, env: AppEnv) => {
  if (import.meta.env.DEV) return true;

  const provided = request.headers.get("X-Storage-Key");
  if (!provided || !env.SECRET_KEY) return false;

  const encoder = new TextEncoder();
  const providedBytes = encoder.encode(provided);
  const expectedBytes = encoder.encode(env.SECRET_KEY);
  return providedBytes.byteLength === expectedBytes.byteLength && timingSafeEqual(providedBytes, expectedBytes);
};

const getObject = async (request: Request, key: string, env: AppEnv) => {
  if (request.method === "HEAD") {
    const object = await env.ASSETS.head(key);
    if (!object) return new Response(null, { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    return new Response(null, { headers });
  }

  const object = await env.ASSETS.get(key, { onlyIf: request.headers, range: request.headers });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response("body" in object ? object.body : undefined, {
    headers,
    status: "body" in object ? (request.headers.has("range") ? 206 : 200) : 412,
  });
};

export default {
  fetch: async (request: Request, env: AppEnv) => {
    const requestUrl = new URL(request.url);

    const storageMatch = requestUrl.pathname.match(/^\/internal\/storage\/([0-9a-f-]+)$/i);
    if (storageMatch) {
      if (!hasStorageAccess(request, env)) return new Response("Forbidden", { status: 403 });

      const key = storageMatch[1];
      if (request.method === "PUT") {
        await env.ASSETS.put(key, request.body, {
          httpMetadata: { contentType: request.headers.get("content-type") ?? "application/octet-stream" },
        });
        return new Response(null, { status: 204 });
      }

      if (request.method === "DELETE") {
        await env.ASSETS.delete(key);
        return new Response(null, { status: 204 });
      }

      if (request.method === "GET" || request.method === "HEAD") return getObject(request, key, env);
      return new Response("Method not allowed", { headers: { Allow: "DELETE, GET, HEAD, PUT" }, status: 405 });
    }

    // Proxy API requests to the C# backend
    if (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/")) {
      const url = new URL(request.url);
      return proxy(request, url, env);
    }

    // Serve existing assets directly from R2.
    const assetViewMatch = requestUrl.pathname.match(/^\/assets\/([^/]+)\/view$/);
    if (assetViewMatch) {
      const assetId = assetViewMatch[1];
      const metadataUrl = new URL(`/api/asset/${assetId}`, request.url);
      const metadataResponse = await proxy(new Request(metadataUrl), metadataUrl, env);
      if (!metadataResponse.ok) return new Response(null, { status: metadataResponse.status });

      return getObject(request, assetId, env);
    }

    return handler.fetch(request);
  },
};
