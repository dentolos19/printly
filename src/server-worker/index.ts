import { Container as CloudflareContainer } from "@cloudflare/containers";
import { Hono } from "hono";

export class Container extends CloudflareContainer<CloudflareEnv> {
  defaultPort = 8080;
  sleepAfter = "10m";
}

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.all("*", async (c) => {
  const instance = c.env.CONTAINER.getByName("instance");
  const variables = Object.fromEntries(Object.entries(process.env)) as Record<string, string>;

  await instance.startAndWaitForPorts({
    startOptions: {
      envVars: variables,
    },
  });

  return await instance.fetch(c.req.raw);
});

export default app;
