"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/providers/cart";
import { cn } from "@/lib/utils";
import { ChevronDown, Download, FileDown, Home, Redo2, RotateCcw, Save, ShoppingCart, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { SaveIndicator } from "../../shared/components/save-indicator";
import { EXPORT_PRESETS } from "../types";
import { useImprinter } from "./hooks/use-imprinter";

type ToolbarHeaderProps = {
  className?: string;
  title?: string;
};

const NAME_DEBOUNCE_MS = 800;

type DebouncedNameInputHandle = {
  flush: () => string;
};

export function ToolbarHeader({ className, title = "Printly Imprinter" }: ToolbarHeaderProps) {
  const router = useRouter();
  const { addItemWithImprint } = useCart();
  const nameInputRef = useRef<DebouncedNameInputHandle | null>(null);
  const {
    imprintId,
    imprintName,
    setImprintName,
    saveStatus,
    isDirty,
    lastSavedAt,
    saveImprint,
    exportRender,
    exportHighRes,
    resetCamera,
    selectedProduct,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useImprinter();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleSaveImprint = useCallback(async () => {
    const latestName = nameInputRef.current?.flush();
    return saveImprint({ force: true, nameOverride: latestName });
  }, [saveImprint]);

  const handleAddToCart = async () => {
    if (!selectedProduct?.product || !selectedProduct?.variant) {
      toast.error("No product selected", {
        description: "Please select a product and variant before adding to cart.",
      });
      return;
    }

    setIsAddingToCart(true);

    try {
      let currentImprintId = imprintId;
      if (isDirty || !imprintId) {
        currentImprintId = await handleSaveImprint();
      }

      if (!currentImprintId) {
        toast.error("Failed to save imprint", {
          description: "Please try saving your design manually first.",
        });
        setIsAddingToCart(false);
        return;
      }

      const { product, variant } = selectedProduct;

      addItemWithImprint(product, variant, 1, {
        id: currentImprintId,
        name: imprintName || "Custom Design",
        customizationPrice: 5.0,
      });

      toast.success("Added to cart!", {
        description: `${product.name} with custom design added to your cart.`,
        action: {
          label: "View Cart",
          onClick: () => router.push("/cart"),
        },
      });
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error("Failed to add to cart", {
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleExport = async (preset: (typeof EXPORT_PRESETS)[number]) => {
    setIsExporting(true);
    try {
      await exportHighRes(preset);
      toast.success("Export complete", {
        description: `Rendered at ${preset.width}x${preset.height}`,
      });
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
      setExportDialogOpen(false);
    }
  };

  return (
    <header className={cn("bg-background flex h-12 items-center justify-between border-b px-4", className)}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/library?tab=imprints")} className="h-8 w-8">
          <Home className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              File
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => void handleSaveImprint()}>
              <Save className="mr-2 h-4 w-4" />
              Save
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Render...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportRender(1920)}>
              <Download className="mr-2 h-4 w-4" />
              Quick Export (1080p)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              Edit
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={undo} disabled={!canUndo}>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
              <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={redo} disabled={!canRedo}>
              <Redo2 className="mr-2 h-4 w-4" />
              Redo
              <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              View
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={resetCamera}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Camera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="bg-border mx-1 h-5 w-px" />

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} />
        <div className="flex items-center justify-end pl-4">
          <DebouncedNameInput
            ref={nameInputRef}
            value={imprintName}
            onChange={setImprintName}
            onCommit={(name) => {
              void saveImprint({ force: true, nameOverride: name });
            }}
            placeholder="Untitled Imprint"
          />
        </div>
        <Button
          variant="default"
          size="sm"
          className="h-8 gap-2"
          onClick={handleAddToCart}
          disabled={isAddingToCart || !selectedProduct?.variant}
        >
          <ShoppingCart className="h-4 w-4" />
          {isAddingToCart ? "Adding..." : "Add to Cart"}
        </Button>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Render</DialogTitle>
            <DialogDescription>Choose a resolution to export your design as a PNG image.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {EXPORT_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                className="justify-between"
                onClick={() => handleExport(preset)}
                disabled={isExporting}
              >
                <span>{preset.label}</span>
                <span className="text-muted-foreground text-xs">
                  {preset.width}&times;{preset.height}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

const DebouncedNameInput = forwardRef<
  DebouncedNameInputHandle,
  {
    value: string;
    onChange: (name: string) => void;
    onCommit?: (name: string) => void;
    placeholder?: string;
  }
>(function DebouncedNameInput({ value, onChange, onCommit, placeholder }, ref) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalValue(value);
    localValueRef.current = value;
  }, [value]);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const latestValue = localValueRef.current;
    onChangeRef.current(latestValue);
    return latestValue;
  }, []);

  useImperativeHandle(ref, () => ({ flush }), [flush]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    localValueRef.current = next;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(next);
      timeoutRef.current = null;
    }, NAME_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      onBlur={() => {
        const latestValue = flush();
        onCommit?.(latestValue);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const latestValue = flush();
          onCommit?.(latestValue);
        }
      }}
      className={"h-7 w-48 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"}
      placeholder={placeholder}
    />
  );
});
