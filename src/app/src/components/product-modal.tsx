"use client";

import { Image } from "@unpic/react";
import { Minus, Package, Plus, ShoppingCart, Stamp } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { useCart } from "#/lib/providers/cart";
import {
  type ProductResponse,
  type ProductSize,
  ProductSizeLabels,
  type ProductVariantResponse,
} from "#/lib/server/product";

type ProductModalProps = {
  product: ProductResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductModal({ product, open, onOpenChange }: ProductModalProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
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
    return Array.from(colors).sort();
  }, [product]);

  // Get the selected variant
  const selectedVariant = useMemo<ProductVariantResponse | null>(() => {
    if (!product || selectedSize === null || selectedColor === null) return null;
    return product.variants.find((v) => v.size === selectedSize && v.color === selectedColor) ?? null;
  }, [product, selectedSize, selectedColor]);

  // Get the display image - show selected variant image, then product image as fallback
  const displayImage = useMemo(() => {
    if (!product) return null;

    // If we have a selected variant with an image, show it
    if (selectedVariant?.imageUrl) return selectedVariant.imageUrl;

    // If we have a selected color, show the first variant image for that color
    if (selectedColor) {
      const colorVariant = product.variants.find((v) => v.color === selectedColor && v.imageUrl);
      if (colorVariant?.imageUrl) return colorVariant.imageUrl;
    }

    // Try to find any variant with an image
    const variantWithImage = product.variants.find((v) => v.imageUrl);
    if (variantWithImage?.imageUrl) return variantWithImage.imageUrl;

    // Fallback to product image if no variant images exist
    return product.imageUrl ?? null;
  }, [product, selectedVariant, selectedColor]);

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
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Select your preferred size and color to add to cart or create a custom design.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Image */}
          <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-lg border bg-muted">
            {displayImage ? (
              <Image
                alt={product.name}
                className="object-cover transition-opacity duration-200"
                fill
                src={displayImage}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Package className="h-16 w-16" />
              </div>
            )}
          </div>

          {/* Price Display */}
          <div className="text-center">
            <span className="font-bold text-3xl">${product.basePrice.toFixed(2)}</span>
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <Label>Size</Label>
            <Select
              onValueChange={(value) => setSelectedSize(Number(value) as ProductSize)}
              value={selectedSize !== null ? String(selectedSize) : undefined}
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
            <Select onValueChange={(value) => setSelectedColor(value)} value={selectedColor ?? undefined}>
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

          {/* Quantity Selection */}
          {selectedVariant && isInStock && (
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-2">
                <Button disabled={quantity <= 1} onClick={decrementQuantity} size="icon" variant="outline">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button disabled={quantity >= stock} onClick={incrementQuantity} size="icon" variant="outline">
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
            className="gap-2"
            disabled={!selectedVariant}
            onClick={() => {
              if (selectedVariant) {
                handleOpenChange(false);
                window.location.href = `/imprinter/new?product=${product.id}&variant=${selectedVariant.id}`;
              }
            }}
            variant="outline"
          >
            <Stamp className="h-4 w-4" />
            Create Imprint
          </Button>
          <Button className="gap-2" disabled={!selectedVariant || !isInStock} onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
