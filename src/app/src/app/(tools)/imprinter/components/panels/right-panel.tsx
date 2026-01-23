"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Eye, Layers, MapPin, RotateCcw, Settings, Shirt, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PrintArea } from "../../types";
import { useImprinter } from "../hooks/use-imprinter";

type RightPanelProps = {
  className?: string;
};

export function RightPanel({ className }: RightPanelProps) {
  const [productOpen, setProductOpen] = useState(true);
  const [printAreaOpen, setPrintAreaOpen] = useState(true);
  const [designsOpen, setDesignsOpen] = useState(true);
  const [transformOpen, setTransformOpen] = useState(true);
  const [width, setWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      if (newWidth >= 200 && newWidth <= 500) {
        setWidth(newWidth);
      }
    },
    [isResizing],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={panelRef}
      className={cn("bg-background relative flex h-full flex-col border-l", className)}
      style={{ width }}
    >
      <div
        className={cn(
          "hover:bg-primary absolute top-0 left-0 h-full w-1 cursor-ew-resize transition-colors",
          isResizing && "bg-primary",
        )}
        onMouseDown={handleMouseDown}
      />

      <PanelHeader />

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          <ProductSection open={productOpen} onOpenChange={setProductOpen} />
          <Separator className="my-2" />
          <PrintAreaSection open={printAreaOpen} onOpenChange={setPrintAreaOpen} />
          <Separator className="my-2" />
          <AppliedDesignsSection open={designsOpen} onOpenChange={setDesignsOpen} />
          <Separator className="my-2" />
          <TransformSection open={transformOpen} onOpenChange={setTransformOpen} />
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Panel Header
// ============================================================================

function PanelHeader() {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        <span className="text-sm font-medium">Properties</span>
      </div>
    </div>
  );
}

// ============================================================================
// Product Section
// ============================================================================

type ProductSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ProductSection({ open, onOpenChange }: ProductSectionProps) {
  const { 
    selectedProduct, 
    availableProducts, 
    productColor, 
    selectProduct, 
    changeProductColor 
  } = useImprinter();

  // Get available colors from the selected product's variants
  const availableColors = selectedProduct?.product.variants
    .map(v => v.color)
    .filter((color, index, self) => self.indexOf(color) === index) || [];

  const handleProductChange = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    if (product) {
      // Auto-select first variant if available
      const firstVariant = product.variants[0] || null;
      selectProduct(product, firstVariant);
    }
  };

  const handleColorChange = (color: string) => {
    if (selectedProduct) {
      // Find a variant with this color
      const variant = selectedProduct.product.variants.find(v => v.color === color);
      if (variant) {
        selectProduct(selectedProduct.product, variant);
      }
    }
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <Shirt className="h-4 w-4" />
          <span className="text-sm font-medium">Product</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-2 pt-3 pb-2">
        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          {availableProducts.length === 0 ? (
            <p className="text-muted-foreground text-xs">No products with 3D models available</p>
          ) : (
            <Select 
              value={selectedProduct?.product.id || ""} 
              onValueChange={handleProductChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedProduct && availableColors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Variant Color</Label>
            <Select 
              value={selectedProduct.variant?.color || ""} 
              onValueChange={handleColorChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {availableColors.map((color) => (
                  <SelectItem key={color} value={color}>
                    {color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Model Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={productColor}
              onChange={(e) => changeProductColor(e.target.value)}
              className="h-9 w-full cursor-pointer rounded-md border"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Print Area Section
// ============================================================================

type PrintAreaSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PrintAreaSection({ open, onOpenChange }: PrintAreaSectionProps) {
  const { activePrintArea, setActivePrintArea, availablePrintAreas, selectedProduct } = useImprinter();

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium">Print Area</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-2 pt-3 pb-2">
        {!selectedProduct ? (
          <p className="text-muted-foreground text-xs">Select a product first</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Active Area</Label>
              <Select 
                value={activePrintArea} 
                onValueChange={(v) => setActivePrintArea(v as PrintArea)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePrintAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-xs">Designs added from the left panel will be placed on this area.</p>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Applied Designs Section
// ============================================================================

type AppliedDesignsSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AppliedDesignsSection({ open, onOpenChange }: AppliedDesignsSectionProps) {
  const { appliedDesigns, selectedDesignId, selectDesign, removeDesign } = useImprinter();

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span className="text-sm font-medium">Applied Designs</span>
          <span className="text-muted-foreground text-xs">({appliedDesigns.length})</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 px-2 pt-3 pb-2">
        {appliedDesigns.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-muted-foreground text-xs">No designs applied</p>
          </div>
        ) : (
          appliedDesigns.map((design) => (
            <div
              key={design.id}
              className={cn(
                "hover:bg-accent flex items-center gap-2 rounded-md p-2 text-sm transition-colors",
                selectedDesignId === design.id && "bg-accent",
              )}
            >
              <button
                className="flex flex-1 items-center gap-2 overflow-hidden"
                onClick={() => selectDesign(design.id)}
              >
                <Eye className="h-3 w-3 shrink-0" />
                <span className="truncate text-xs">{design.designData.name}</span>
              </button>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeDesign(design.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Transform Section
// ============================================================================

type TransformSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function TransformSection({ open, onOpenChange }: TransformSectionProps) {
  const { selectedDesignId, appliedDesigns, updateDesignTransform, updateDesignOpacity } = useImprinter();

  const selectedDesign = appliedDesigns.find((d) => d.id === selectedDesignId);

  if (!selectedDesign) {
    return (
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm font-medium">Transform</span>
          </div>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-2 pt-3 pb-2">
          <p className="text-muted-foreground text-xs">Select a design to transform</p>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          <span className="text-sm font-medium">Transform</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-2 pt-3 pb-2">
        <div className="space-y-2">
          <Label className="text-xs">Position X</Label>
          <Slider
            value={[selectedDesign.transform.position[0]]}
            onValueChange={([x]) =>
              updateDesignTransform(selectedDesign.id, {
                position: [x, selectedDesign.transform.position[1], selectedDesign.transform.position[2]],
              })
            }
            min={-5}
            max={5}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Position Y</Label>
          <Slider
            value={[selectedDesign.transform.position[1]]}
            onValueChange={([y]) =>
              updateDesignTransform(selectedDesign.id, {
                position: [selectedDesign.transform.position[0], y, selectedDesign.transform.position[2]],
              })
            }
            min={-5}
            max={5}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Scale</Label>
          <Slider
            value={[selectedDesign.transform.scale[0]]}
            onValueChange={([s]) =>
              updateDesignTransform(selectedDesign.id, {
                scale: [s, s, s],
              })
            }
            min={0.1}
            max={3}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Rotation</Label>
          <Slider
            value={[selectedDesign.transform.rotation[2]]}
            onValueChange={([r]) =>
              updateDesignTransform(selectedDesign.id, {
                rotation: [0, 0, r],
              })
            }
            min={0}
            max={360}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Opacity</Label>
          <Slider
            value={[selectedDesign.opacity * 100]}
            onValueChange={([o]) => {
              updateDesignOpacity(selectedDesign.id, o / 100);
            }}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
