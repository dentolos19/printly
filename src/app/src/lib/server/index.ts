import initAnalysisController from "@/lib/server/analysis";
import initAssetController from "@/lib/server/asset";
import initAuthController from "@/lib/server/auth";
import initChatbotController from "@/lib/server/chatbot";
import initConversationController from "@/lib/server/conversation";
import initDesignController from "@/lib/server/design";
import initGenerateController from "@/lib/server/generate";
import initInventoryController from "@/lib/server/inventory";
import initOrderController from "@/lib/server/order";
import initProductController from "@/lib/server/product";
import initTicketController from "@/lib/server/ticket";
import initVariantController from "@/lib/server/variant";
import { ServerFetch } from "@/types";

export default function generateServerFunctions(fetch: ServerFetch) {
  return {
    analysis: initAnalysisController(fetch),
    asset: initAssetController(fetch),
    auth: initAuthController(fetch),
    chatbot: initChatbotController(fetch),
    design: initDesignController(fetch),
    generate: initGenerateController(fetch),
    product: initProductController(fetch),
    variant: initVariantController(fetch),
    inventory: initInventoryController(fetch),
    order: initOrderController(fetch),
    conversation: initConversationController(fetch),
    ticket: initTicketController(fetch),
  };
}
