import initAssetController from "@/lib/server/asset";
import initDesignController from "@/lib/server/design";
import initGenerateController from "@/lib/server/generate";
import { ServerFetch } from "@/types";

export default function generateServerFunctions(fetch: ServerFetch) {
  return {
    asset: initAssetController(fetch),
    design: initDesignController(fetch),
    generate: initGenerateController(fetch),
  };
}
