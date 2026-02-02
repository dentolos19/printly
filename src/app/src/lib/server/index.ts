import initAnalysisController from "@/lib/server/analysis";
import initAssetController from "@/lib/server/asset";
import initAuthController from "@/lib/server/auth";
import initChatbotController from "@/lib/server/chatbot";
import initCommunityController from "@/lib/server/community";
import initConversationController from "@/lib/server/conversation";
import initDesignController from "@/lib/server/design";
import initGenerateController from "@/lib/server/generate";
import initImprintController from "@/lib/server/imprint";
import initInventoryController from "@/lib/server/inventory";
import initOrderController from "@/lib/server/order";
import initPaymentController from "@/lib/server/payment";
import initPrintAreaController from "@/lib/server/print-area";
import initProductController from "@/lib/server/product";
import initRefundController from "@/lib/server/refund";
import initTicketController from "@/lib/server/ticket";
import initVariantController from "@/lib/server/variant";
import { ServerFetch } from "@/types";

export default function generateServerFunctions(fetch: ServerFetch) {
  return {
    analysis: initAnalysisController(fetch),
    asset: initAssetController(fetch),
    auth: initAuthController(fetch),
    chatbot: initChatbotController(fetch),
    community: initCommunityController(fetch),
    design: initDesignController(fetch),
    generate: initGenerateController(fetch),
    imprint: initImprintController(fetch),
    printArea: initPrintAreaController(fetch),
    product: initProductController(fetch),
    variant: initVariantController(fetch),
    inventory: initInventoryController(fetch),
    order: initOrderController(fetch),
    payment: initPaymentController(fetch),
    refund: initRefundController(fetch),
    conversation: initConversationController(fetch),
    ticket: initTicketController(fetch),
  };
}
