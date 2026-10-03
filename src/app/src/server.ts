import { Container, getContainer } from "@cloudflare/containers";
import handler from "@tanstack/react-start/server-entry";
import { AwsClient } from "aws4fetch";

const PORT = 3001;

export class Server extends Container<Env> {
  defaultPort = PORT;
  sleepAfter = "10m";
  envVars = Object.fromEntries(
    Object.entries(this.env).filter(([, value]) => typeof value === "string" && !!value),
  ) as Record<string, string>;
}

const proxy = (request: Request, url: URL, env: Env) => {
  if (import.meta.env.DEV) {
    url.protocol = "http";
    url.host = `localhost:${PORT}`;
    return fetch(new Request(url.toString(), request));
  }

  return getContainer(env.SERVER, "singleton").fetch(new Request(url.toString(), request));
};

const getObject = async (request: Request, key: string, env: Env) => {
  const storage = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    service: "s3",
  });
  const url = new URL(`${env.AWS_ENDPOINT_URL_S3.replace(/\/$/, "")}/main/${encodeURIComponent(key)}`);
  const headers = new Headers();
  for (const name of ["if-match", "if-none-match", "if-modified-since", "if-unmodified-since", "range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const object = await storage.fetch(url, { method: request.method === "HEAD" ? "HEAD" : "GET", headers });
  if (object.status === 404) return new Response("Not found", { status: 404 });
  if (!object.ok && ![304, 412, 416].includes(object.status)) {
    throw new Error("Could not read the asset from storage.");
  }
  const responseHeaders = new Headers();
  for (const name of [
    "cache-control",
    "content-disposition",
    "content-encoding",
    "content-language",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
    "accept-ranges",
  ]) {
    const value = object.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(request.method === "HEAD" || [304, 412, 416].includes(object.status) ? null : object.body, {
    headers: responseHeaders,
    status: object.status,
  });
};

export default {
  fetch: async (request: Request, env: Env) => {
    const requestUrl = new URL(request.url);

    // Proxy API requests to the C# backend
    if (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/")) {
      const url = new URL(request.url);
      return proxy(request, url, env);
    }

    // Serve assets from S3-compatible storage.
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
