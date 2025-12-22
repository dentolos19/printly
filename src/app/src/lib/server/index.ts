import generateController from "@/lib/server/generate";
import { ServerFetch } from "@/types";

export default function generateServerFunctions(fetch: ServerFetch) {
  return {
    generate: generateController(fetch),
  };
}
