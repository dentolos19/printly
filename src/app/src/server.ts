import { Container, getContainer } from "@cloudflare/containers";
import handler from "@tanstack/react-start/server-entry";

const PORT = 3001;

export class Server extends Container<Env> {
  defaultPort = PORT;
  sleepAfter = "10m";
  envVars = Object.fromEntries(
    Object.entries(this.env).filter(([, value]) => typeof value === "string" && !!value),
  ) as Record<string, string>;
}

export default {
  fetch: async (request: Request, env: Env) => {
    const requestUrl = new URL(request.url);

    // Proxy API requests to the C# backend
    if (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/")) {
      const url = new URL(request.url);

      if (env.SERVER) {
        const instance = getContainer(env.SERVER, "singleton");
        return await instance.fetch(new Request(url.toString(), request));
      } else {
        url.protocol = "http";
        url.host = `localhost:${PORT}`;
        return await fetch(new Request(url.toString(), request));
      }
    }

    // Proxy /assets/{id}/view requests to C# backend /api/asset/{id}/file
    const assetViewMatch = requestUrl.pathname.match(/^\/assets\/([^/]+)\/view$/);
    if (assetViewMatch) {
      const assetId = assetViewMatch[1];
      const url = new URL(request.url);
      url.pathname = `/api/asset/${assetId}/file`;

      if (env.SERVER) {
        const instance = getContainer(env.SERVER, "singleton");
        return await instance.fetch(new Request(url.toString(), request));
      } else {
        url.protocol = "http";
        url.host = `localhost:${PORT}`;
        return await fetch(new Request(url.toString(), request));
      }
    }

    return handler.fetch(request);
  },
};
