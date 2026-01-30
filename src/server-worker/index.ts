import { Container as CloudflareContainer, getContainer } from "@cloudflare/containers";
import { Hono } from "hono";

export class Container extends CloudflareContainer<CloudflareEnv> {
  defaultPort = 8080;
  sleepAfter = "1h";

  override onStart() {
    console.log("Container successfully started!");
  }

  override onStop() {
    console.log("Container successfully stopped!");
  }

  override onError(error: any) {
    console.error("An error occurred.", error);
  }
}

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.all("*", async (c) => {
  const id = c.env.CONTAINER.idFromName("main");
  const stub = c.env.CONTAINER.get(id);
  const container = getContainer(stub as any);

  const variables = {
    ...(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) as Record<
      string,
      string
    >),
  };

  if (c.env.HYPERDRIVE?.connectionString) {
    variables["DATABASE_URL"] = c.env.HYPERDRIVE.connectionString;
  }

  await container.startAndWaitForPorts({
    startOptions: {
      envVars: variables,
    },
  });

  return await container.fetch(c.req.raw);
});

export default app;
