import { Container, getContainer } from "@cloudflare/containers";
import { Hono } from "hono";

export class ServerContainer extends Container<Env> {
  // Port the container listens on (default: 8080)
  defaultPort = 8080;

  // Time before container sleeps due to inactivity (default: 30s)
  sleepAfter = "2m";

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

const app = new Hono<{ Bindings: Env }>();

// Catch-all route for undefined endpoints
app.all("*", async (c) => {
  const container = getContainer(c.env.SERVER_CONTAINER);
  return await container.fetch(c.req.raw);
});

// // Load balance requests across multiple containers
// app.get("/lb", async (c) => {
//   const container = await getRandom(c.env.SERVER_CONTAINER, 3);
//   return await container.fetch(c.req.raw);
// });

// // Get a single container instance (singleton pattern)
// app.get("/singleton", async (c) => {
//   const container = getContainer(c.env.SERVER_CONTAINER);
//   return await container.fetch(c.req.raw);
// });

export default app;