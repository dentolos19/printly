import initAssetController from "@/lib/server/asset";
import initAuthController from "@/lib/server/auth";
import initChatbotController from "@/lib/server/chatbot";
import initDesignController from "@/lib/server/design";
import initGenerateController from "@/lib/server/generate";
import { ServerFetch } from "@/types";

export default function generateServerFunctions(fetch: ServerFetch) {
  return {
    asset: initAssetController(fetch),
    auth: initAuthController(fetch),
    chatbot: initChatbotController(fetch),
    design: initDesignController(fetch),
    generate: initGenerateController(fetch),
  };
}
