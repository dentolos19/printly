import { bindings, defineConfig, defineContainer, defineWorker, exports } from "cf/config";

import * as entrypoint from "./src/server.ts" with { type: "cf-worker" };

const workerName = "printly";

const server = defineContainer({
  name: `${workerName}-server`,
  image: { dockerfile: "../server/Dockerfile" },
  instanceType: "standard-1",
  maxInstances: 1,
});

const worker = defineWorker(({ mode }) => ({
  name: workerName,
  compatibilityDate: "2026-10-01",
  entrypoint,
  exports: {
    Server:
      mode === "development"
        ? exports.durableObject({ storage: "sqlite" })
        : exports.durableObject({ storage: "sqlite", container: server }),
  },
}));

export default defineConfig((context) => ({
  containers: context.mode === "development" ? [] : [server],
  worker: {
    ...worker(context),
    observability: {
      logs: { enabled: true },
      traces: { enabled: true },
      issues: { enabled: true },
    },
    domains: ["printly.dennise.me"],
    env: {
      APP_URL: bindings.secret(),
      AWS_ACCESS_KEY_ID: bindings.secret(),
      AWS_ENDPOINT_URL_S3: bindings.secret(),
      AWS_REGION: bindings.secret(),
      AWS_SECRET_ACCESS_KEY: bindings.secret(),
      DATABASE_URL: bindings.secret(),
      ELEVENLABS_AGENT_ID: bindings.secret(),
      ELEVENLABS_API_KEY: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      LIVEKIT_API_KEY: bindings.secret(),
      LIVEKIT_API_SECRET: bindings.secret(),
      LIVEKIT_URL: bindings.secret(),
      OPENROUTER_API_KEY: bindings.secret(),
      OPENROUTER_IMAGE_MODEL: bindings.secret(),
      OPENROUTER_MODEL: bindings.secret(),
      OPENROUTER_REFERER: bindings.secret(),
      OPENROUTER_TITLE: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      RESEND_FROM_EMAIL: bindings.secret(),
      SECRET_KEY: bindings.secret(),
      SERVER: bindings.durableObject<typeof worker, "Server">({ worker, exportName: "Server" }),
    },
  },
}));
