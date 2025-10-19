import { Container, getRandom } from "@cloudflare/containers";
import { Hono } from "hono";

export class ServerContainer extends Container<CloudflareEnv> {
  // Port the container listens on (default: 8080)
  defaultPort = 8080;

  // Time before container sleeps due to inactivity (default: 30s)
  sleepAfter = "10m";

  // Environment variables passed to the container
  envVars = {
    // MESSAGE: "I was passed in via the container class!",
  };

  override onStart() {
    console.log("Container successfully started!");
  }

  override onStop() {
    console.log("Container successfully shut down!");
  }

  override onError(error: unknown) {
    console.log("Container error:", error);
  }
}

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.all("*", async (c) => {
  const container = await getRandom(c.env.SERVER_CONTAINER, 3);
  return await container.fetch(c.req.raw);
});

export default app;