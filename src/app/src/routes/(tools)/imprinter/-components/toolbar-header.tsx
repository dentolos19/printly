import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Download, FileDown, Home, Redo2, RotateCcw, Save, ShoppingCart, Undo2 } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { useCart } from "#/lib/providers/cart";
import { cn } from "#/lib/utils";
import { SaveIndicator } from "#/routes/(tools)/-shared/components/save-indicator";
import { useUnsavedChangesGuard } from "#/routes/(tools)/-shared/hooks";
import { EXPORT_PRESETS } from "#/routes/(tools)/imprinter/-types";

import { useImprinter } from "./hooks/use-imprinter";

type ToolbarHeaderProps = {
  className?: string;
  title?: string;
};

const NAME_DEBOUNCE_MS = 800;

type DebouncedNameInputHandle = {
  flush: () => string;
};

export function ToolbarHeader({ className, _title = "Printly Imprinter" }: ToolbarHeaderProps) {
  const _navigate = useNavigate();
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

  const hasPendingServerSave = isDirty || saveStatus === "saving" || saveStatus === "error";
  const { allowNextNavigation, confirmNavigation } = useUnsavedChangesGuard({
    when: hasPendingServerSave,
    message: "Your imprint is not fully saved to the server yet. Leave anyway?",
  });

  const navigateWithGuard = useCallback(
    (href: string) => {
      if (!confirmNavigation(href)) {
        return;
      }

      allowNextNavigation();
      window.location.href = href;
    },
    [allowNextNavigation, confirmNavigation],
  );

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
          onClick: () => navigateWithGuard("/cart"),
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
    <header className={cn("flex h-12 items-center justify-between border-b bg-background px-4", className)}>
      <div className="flex items-center gap-2">
        <Button
          className="h-8 w-8"
          onClick={() => navigateWithGuard("/library?tab=imprints")}
          size="icon"
          variant="ghost"
        >
          <Home className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 gap-1" size="sm" variant="ghost">
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
            <Button className="h-8 gap-1" size="sm" variant="ghost">
              Edit
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled={!canUndo} onClick={undo}>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
              <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canRedo} onClick={redo}>
              <Redo2 className="mr-2 h-4 w-4" />
              Redo
              <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 gap-1" size="sm" variant="ghost">
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

        <Button className="h-8 w-8" disabled={!canUndo} onClick={undo} size="icon" title="Undo" variant="ghost">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button className="h-8 w-8" disabled={!canRedo} onClick={redo} size="icon" title="Redo" variant="ghost">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <SaveIndicator isDirty={isDirty} lastSavedAt={lastSavedAt} status={saveStatus} />
        <div className="flex items-center justify-end pl-4">
          <DebouncedNameInput
            onChange={setImprintName}
            onCommit={(name) => {
              void saveImprint({ force: true, nameOverride: name });
            }}
            placeholder="Untitled Imprint"
            ref={nameInputRef}
            value={imprintName}
          />
        </div>
        <Button
          className="h-8 gap-2"
          disabled={isAddingToCart || !selectedProduct?.variant}
          onClick={handleAddToCart}
          size="sm"
          variant="default"
        >
          <ShoppingCart className="h-4 w-4" />
          {isAddingToCart ? "Adding..." : "Add to Cart"}
        </Button>
      </div>

      {/* Export Dialog */}
      <Dialog onOpenChange={setExportDialogOpen} open={exportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Render</DialogTitle>
            <DialogDescription>Choose a resolution to export your design as a PNG image.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {EXPORT_PRESETS.map((preset) => (
              <Button
                className="justify-between"
                disabled={isExporting}
                key={preset.label}
                onClick={() => handleExport(preset)}
                variant="outline"
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
      className={"h-7 w-48 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"}
      onBlur={() => {
        const latestValue = flush();
        onCommit?.(latestValue);
      }}
      onChange={handleChange}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const latestValue = flush();
          onCommit?.(latestValue);
        }
      }}
      placeholder={placeholder}
      value={localValue}
    />
  );
});
