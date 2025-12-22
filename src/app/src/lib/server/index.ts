import initDesignController from "@/lib/server/design";
import initGenerateController from "@/lib/server/generate";
import { ServerFetch } from "@/types";

export default function generateServerFunctions(fetch: ServerFetch) {
  return {
    design: initDesignController(fetch),
    generate: initGenerateController(fetch),
  };
}
