"use client";

import { Button } from "@/components/ui/button";
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
import { Book, ChevronDown, FileDown, Home, Info, Keyboard, RotateCcw, Save, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SaveIndicator } from "../../shared/components/save-indicator";
import { useImprinter } from "./hooks/use-imprinter";

type ToolbarHeaderProps = {
  className?: string;
  title?: string;
};

export function ToolbarHeader({ className, title = "Printly Imprinter" }: ToolbarHeaderProps) {
  const router = useRouter();
  const { addItemWithImprint } = useCart();
  const {
    imprintId,
    imprintName,
    setImprintName,
    saveStatus,
    isDirty,
    lastSavedAt,
    saveImprint,
    exportRender,
    resetCamera,
    selectedProduct,
  } = useImprinter();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    // Validate product and variant are selected
    if (!selectedProduct?.product || !selectedProduct?.variant) {
      toast.error("No product selected", {
        description: "Please select a product and variant before adding to cart.",
      });
      return;
    }

    setIsAddingToCart(true);

    try {
      // Save imprint first if there are unsaved changes or if it's new
      let currentImprintId = imprintId;
      if (isDirty || !imprintId) {
        currentImprintId = await saveImprint();
      }

      if (!currentImprintId) {
        toast.error("Failed to save imprint", {
          description: "Please try saving your design manually first.",
        });
        setIsAddingToCart(false);
        return;
      }

      const { product, variant } = selectedProduct;

      // Add to cart with imprint
      addItemWithImprint(product, variant, 1, {
        id: currentImprintId,
        name: imprintName || "Custom Design",
        customizationPrice: 5.0, // Default customization price - could be fetched from backend
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
            <DropdownMenuItem onClick={() => saveImprint()}>
              <Save className="mr-2 h-4 w-4" />
              Save
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportRender(1920)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Render
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              Help
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <Keyboard className="mr-2 h-4 w-4" />
              Keyboard Shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Book className="mr-2 h-4 w-4" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Info className="mr-2 h-4 w-4" />
              About
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} />
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

      <div className="flex items-center justify-end pl-4">
        <Input
          value={imprintName}
          onChange={(e) => setImprintName(e.target.value)}
          className={"h-7 w-48 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"}
          placeholder="Untitled Imprint"
        />
      </div>
    </header>
  );
}
