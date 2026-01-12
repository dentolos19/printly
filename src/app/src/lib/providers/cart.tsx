"use client";

import { ProductResponse, ProductSizeLabels, ProductVariantResponse } from "@/lib/server/product";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

export type CartItem = {
  variantId: string;
  productId: string;
  productName: string;
  size: number;
  color: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: ProductResponse, variant: ProductVariantResponse, quantity: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
};

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotal: () => 0,
  getItemCount: () => 0,
});

export function useCart() {
  return useContext(CartContext);
}

const CART_STORAGE_KEY = "printly-cart";

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load cart from storage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Failed to save cart to storage:", error);
      }
    }
  }, [items, isHydrated]);

  const addItem = (product: ProductResponse, variant: ProductVariantResponse, quantity: number) => {
    const stock = variant.inventory?.quantity ?? 0;

    if (stock <= 0) {
      toast.error("Out of stock", {
        description: `${product.name} (${ProductSizeLabels[variant.size]}, ${variant.color}) is currently out of stock.`,
      });
      return;
    }

    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex((item) => item.variantId === variant.id);

      if (existingIndex >= 0) {
        const existingItem = currentItems[existingIndex];
        const newQuantity = existingItem.quantity + quantity;

        if (newQuantity > stock) {
          toast.error("Not enough stock", {
            description: `Only ${stock} items available. You already have ${existingItem.quantity} in your cart.`,
          });
          return currentItems;
        }

        const newItems = [...currentItems];
        newItems[existingIndex] = { ...existingItem, quantity: newQuantity };

        toast.success("Cart updated", {
          description: `${product.name} quantity increased to ${newQuantity}.`,
        });

        return newItems;
      }

      if (quantity > stock) {
        toast.error("Not enough stock", {
          description: `Only ${stock} items available.`,
        });
        return currentItems;
      }

      const newItem: CartItem = {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        size: variant.size,
        color: variant.color,
        quantity,
        unitPrice: product.basePrice,
        maxStock: stock,
      };

      toast.success("Added to cart", {
        description: `${product.name} (${ProductSizeLabels[variant.size]}, ${variant.color}) added to your cart.`,
      });

      return [...currentItems, newItem];
    });
  };

  const removeItem = (variantId: string) => {
    setItems((currentItems) => {
      const item = currentItems.find((i) => i.variantId === variantId);
      if (item) {
        toast.success("Removed from cart", {
          description: `${item.productName} removed from your cart.`,
        });
      }
      return currentItems.filter((i) => i.variantId !== variantId);
    });
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }

    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex((item) => item.variantId === variantId);

      if (existingIndex < 0) {
        return currentItems;
      }

      const existingItem = currentItems[existingIndex];

      if (quantity > existingItem.maxStock) {
        toast.error("Not enough stock", {
          description: `Only ${existingItem.maxStock} items available.`,
        });
        return currentItems;
      }

      const newItems = [...currentItems];
      newItems[existingIndex] = { ...existingItem, quantity };

      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    toast.success("Cart cleared", {
      description: "All items have been removed from your cart.",
    });
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
