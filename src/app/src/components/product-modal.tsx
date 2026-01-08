"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/lib/providers/cart";
import {
  ProductColor,
  ProductColorLabels,
  ProductResponse,
  ProductSize,
  ProductSizeLabels,
  ProductVariantResponse,
} from "@/lib/server/product";
import { Minus, Palette, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProductModalProps = {
  product: ProductResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductModal({ product, open, onOpenChange }: ProductModalProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Get unique available sizes and colors from variants
  const availableSizes = useMemo(() => {
    if (!product) return [];
    const sizes = new Set(product.variants.map((v) => v.size));
    return Array.from(sizes).sort((a, b) => a - b);
  }, [product]);

  const availableColors = useMemo(() => {
    if (!product) return [];
    const colors = new Set(product.variants.map((v) => v.color));
    return Array.from(colors).sort((a, b) => a - b);
  }, [product]);

  // Get the selected variant
  const selectedVariant = useMemo<ProductVariantResponse | null>(() => {
    if (!product || selectedSize === null || selectedColor === null) return null;
    return product.variants.find((v) => v.size === selectedSize && v.color === selectedColor) ?? null;
  }, [product, selectedSize, selectedColor]);

  // Check stock availability
  const stock = selectedVariant?.inventory?.quantity ?? 0;
  const isInStock = stock > 0;

  // Reset selections when product changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedSize(null);
      setSelectedColor(null);
      setQuantity(1);
    }
    onOpenChange(newOpen);
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    addItem(product, selectedVariant, quantity);
    handleOpenChange(false);
  };

  const incrementQuantity = () => {
    if (quantity < stock) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Select your preferred size and color to add to cart or create a custom design.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Display */}
          <div className="text-center">
            <span className="text-3xl font-bold">${product.basePrice.toFixed(2)}</span>
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <Label>Size</Label>
            <Select
              value={selectedSize !== null ? String(selectedSize) : undefined}
              onValueChange={(value) => setSelectedSize(Number(value) as ProductSize)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {ProductSizeLabels[size]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Color</Label>
            <Select
              value={selectedColor !== null ? String(selectedColor) : undefined}
              onValueChange={(value) => setSelectedColor(Number(value) as ProductColor)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {availableColors.map((color) => (
                  <SelectItem key={color} value={String(color)}>
                    {ProductColorLabels[color]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Selection */}
          {selectedVariant && isInStock && (
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={decrementQuantity} disabled={quantity <= 1}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="outline" size="icon" onClick={incrementQuantity} disabled={quantity >= stock}>
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground text-sm">({stock} available)</span>
              </div>
            </div>
          )}

          {/* Stock Status */}
          {selectedVariant && !isInStock && (
            <div className="rounded-md bg-red-50 p-3 text-center text-red-600 dark:bg-red-950 dark:text-red-400">
              This variant is currently out of stock.
            </div>
          )}

          {/* Variant not found warning */}
          {selectedSize !== null && selectedColor !== null && !selectedVariant && (
            <div className="rounded-md bg-yellow-50 p-3 text-center text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400">
              This size and color combination is not available.
            </div>
          )}
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (selectedVariant) {
                handleOpenChange(false);
                window.location.href = `/designer/new?product=${product.id}&variant=${selectedVariant.id}`;
              }
            }}
            disabled={!selectedVariant}
          >
            <Palette className="h-4 w-4" />
            Create Design
          </Button>
          <Button className="gap-2" onClick={handleAddToCart} disabled={!selectedVariant || !isInStock}>
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
