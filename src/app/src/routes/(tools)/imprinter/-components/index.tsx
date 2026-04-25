"use client";

import { Box, Columns2, Grid3X3 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { cn } from "#/lib/utils";
import { FallbackImage } from "#/routes/(tools)/-shared/components/fallback-image";
import { useImprinter } from "./hooks/use-imprinter";
import { useKeyboardShortcuts } from "./hooks/use-keyboard";
import { IconToolbar } from "./icon-toolbar";
import { LeftPanel } from "./panels/left-panel";
import { RightPanel } from "./panels/right-panel";
import { TextPanel } from "./panels/text-panel";
import { ImprinterScene } from "./scene";
import { ToolbarHeader } from "./toolbar-header";
import { Imprinter2DView } from "./view-2d";

export function ImprinterContent() {
  const [viewMode, setViewMode] = useState<"3d" | "2d" | "split">("3d");
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isSplitResizing, setIsSplitResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const {
    leftPanelView,
    rightPanelOpen,
    showProductDialog,
    pendingDesignId,
    availableProducts,
    selectedProduct,
    selectProduct,
    activeTool,
  } = useImprinter();

  const handleSplitMouseDown = useCallback(() => {
    setIsSplitResizing(true);
  }, []);

  const handleSplitMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSplitResizing || !splitContainerRef.current) return;

      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const ratio = (e.clientX - rect.left) / rect.width;
      const clampedRatio = Math.min(0.75, Math.max(0.25, ratio));
      setSplitRatio(clampedRatio);
    },
    [isSplitResizing],
  );

  const handleSplitMouseUp = useCallback(() => {
    setIsSplitResizing(false);
  }, []);

  useEffect(() => {
    if (isSplitResizing) {
      document.addEventListener("mousemove", handleSplitMouseMove);
      document.addEventListener("mouseup", handleSplitMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleSplitMouseMove);
        document.removeEventListener("mouseup", handleSplitMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isSplitResizing, handleSplitMouseMove, handleSplitMouseUp]);

  useKeyboardShortcuts();

  return (
    <>
      <div className="flex h-screen flex-col bg-background">
        <ToolbarHeader />
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <IconToolbar />
          {leftPanelView && <LeftPanel />}
          {activeTool === "text" && <TextPanel />}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedProduct ? (
              <Tabs
                className="flex min-h-0 min-w-0 flex-1 flex-col"
                onValueChange={(v) => setViewMode(v as "3d" | "2d" | "split")}
                value={viewMode}
              >
                <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2">
                  <TabsList className="h-9">
                    <TabsTrigger className="gap-1.5 px-3" value="3d">
                      <Box className="size-4" />
                      3D
                    </TabsTrigger>
                    <TabsTrigger className="gap-1.5 px-3" value="2d">
                      <Grid3X3 className="size-4" />
                      2D
                    </TabsTrigger>
                    <TabsTrigger className="gap-1.5 px-3" value="split">
                      <Columns2 className="size-4" />
                      Split
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent className="mt-0 min-h-0 min-w-0 flex-1 overflow-hidden" value="3d">
                  <ImprinterScene />
                </TabsContent>
                <TabsContent className="mt-0 min-h-0 min-w-0 flex-1 overflow-hidden" value="2d">
                  <Imprinter2DView />
                </TabsContent>
                <TabsContent className="mt-0 min-h-0 min-w-0 flex-1 overflow-hidden" value="split">
                  <div className="flex h-full min-h-0 min-w-0 overflow-hidden" ref={splitContainerRef}>
                    <div
                      className="h-full min-h-0 min-w-0 shrink-0 overflow-hidden"
                      style={{ flexBasis: `${splitRatio * 100}%` }}
                    >
                      <ImprinterScene />
                    </div>
                    <div
                      className={cn(
                        "relative w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary",
                        isSplitResizing && "bg-primary",
                      )}
                      onMouseDown={handleSplitMouseDown}
                    />
                    <div
                      className="h-full min-h-0 min-w-0 shrink-0 overflow-hidden"
                      style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
                    >
                      <Imprinter2DView />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
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
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-md border transition-all",
                    "bg-muted hover:border-primary hover:ring-2 hover:ring-primary/20",
                  )}
                  key={product.id}
                  onClick={() => {
                    const firstVariant = product.variants[0] || null;
                    selectProduct(product, firstVariant);
                  }}
                >
                  {product.modelPreviewId || product.imageId ? (
                    <FallbackImage
                      alt={product.name}
                      className="h-full w-full object-cover"
                      src={`/assets/${product.modelPreviewId ?? product.imageId}/view`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2">
                    <p className="truncate font-medium text-white text-xs">{product.name}</p>
                    {product.variants.length > 0 && (
                      <p className="truncate text-white/80 text-xs">
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
