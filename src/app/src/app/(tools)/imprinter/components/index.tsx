"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useImprinter } from "./hooks/use-imprinter";
import { useKeyboardShortcuts } from "./hooks/use-keyboard";
import { IconToolbar } from "./icon-toolbar";
import { LeftPanel } from "./panels/left-panel";
import { RightPanel } from "./panels/right-panel";
import { ImprinterScene } from "./scene";
import { ToolbarHeader } from "./toolbar-header";

export function ImprinterContent() {
  const {
    leftPanelView,
    rightPanelOpen,
    showProductDialog,
    pendingDesignId,
    availableProducts,
    selectedProduct,
    selectProduct,
  } = useImprinter();
  useKeyboardShortcuts();

  return (
    <>
      <div className="bg-background flex h-screen flex-col">
        <ToolbarHeader />
        <div className="relative flex flex-1 overflow-hidden">
          <IconToolbar />
          {leftPanelView && <LeftPanel />}
          <div className="relative flex-1">
            {selectedProduct ? (
              <ImprinterScene />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-muted-foreground flex flex-col items-center gap-2 text-center">
                  <p className="text-sm">No product selected</p>
                  <p className="text-xs">Select a product from the left panel to get started</p>
                </div>
              </div>
            )}
          </div>
          {rightPanelOpen && <RightPanel />}
        </div>
      </div>

      {/* Product selection dialog */}
      <Dialog open={showProductDialog && !!pendingDesignId}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select a Product</DialogTitle>
            <DialogDescription>
              Choose a product to apply your design to. You can change the product later.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-3 gap-3 p-1">
              {availableProducts.map((product) => (
                <button
                  key={product.id}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-md border transition-all",
                    "bg-muted hover:border-primary hover:ring-primary/20 hover:ring-2",
                  )}
                  onClick={() => {
                    const firstVariant = product.variants[0] || null;
                    selectProduct(product, firstVariant);
                  }}
                >
                  {product.imageId ? (
                    <img
                      src={`/assets/${product.imageId}/view`}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                      No image
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2">
                    <p className="truncate text-xs font-medium text-white">{product.name}</p>
                    {product.variants.length > 0 && (
                      <p className="truncate text-xs text-white/80">
                        {product.variants.length} variant{product.variants.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
