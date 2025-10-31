import { Container as CloudflareContainer, getRandom } from "@cloudflare/containers";
import { Hono } from "hono";

export class Container extends CloudflareContainer<CloudflareEnv> {
  // Port the container listens on (default: 8080)
  defaultPort = 8080;

  // Time before container sleeps due to inactivity (default: 30s)
  sleepAfter = "1m";

  // Environment variables passed to the container
  envVars = {
    ...(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) as Record<
      string,
      string
    >),
  };

  override onStart() {
    console.log("Container successfully started!");
  }

  override onStop() {
    console.log("Container successfully stopped!");
  }

  override onError(error: any) {
    console.error(error);
  }
}

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.all("*", async (c) => {
  const container = await getRandom(c.env.CONTAINER, 3);
  return await container.fetch(c.req.raw);
});

export default app;