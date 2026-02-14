import { Container as CloudflareContainer, getContainer } from "@cloudflare/containers";
import { Hono } from "hono";

export class Container extends CloudflareContainer<CloudflareEnv> {
  defaultPort = 8080;
  sleepAfter = "10m";
  envVars = {
    ...(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) as Record<
      string,
      string
    >),
  };
}

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.all("*", async (c) => {
  return await getContainer(c.env.CONTAINER).fetch(c.req.raw);
});

export default app;
