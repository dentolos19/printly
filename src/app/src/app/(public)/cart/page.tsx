"use client";

import { CartButton } from "@/components/cart-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth, LoggedIn, LoggedOut } from "@/lib/providers/auth";
import { CartItem, useCart } from "@/lib/providers/cart";
import { useServer } from "@/lib/providers/server";
import { ProductSizeLabels } from "@/lib/server/product";
import { ArrowLeft, Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const itemPrice = item.unitPrice + (item.customizationPrice ?? 0);

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-lg">
        <Package className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-medium">{item.productName}</h3>
        <p className="text-muted-foreground text-sm">
          {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]} • {item.color}
        </p>
        {item.imprintName && <p className="text-primary text-sm font-medium">+ Customization: {item.imprintName}</p>}
        <div className="flex items-center gap-2">
          <p className="font-medium">${item.unitPrice.toFixed(2)}</p>
          {item.customizationPrice && item.customizationPrice > 0 && (
            <span className="text-primary text-sm">+ ${item.customizationPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.quantity + 1)}
          disabled={item.quantity >= item.maxStock}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="w-24 text-right font-medium">${(itemPrice * item.quantity).toFixed(2)}</div>
      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ShoppingCart className="text-muted-foreground mb-4 h-16 w-16" />
      <h2 className="mb-2 text-2xl font-bold">Your cart is empty</h2>
      <p className="text-muted-foreground mb-6">Browse our products and add items to your cart to get started.</p>
      <Button asChild>
        <Link href="/#products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Link>
      </Button>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { claims } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const server = useServer();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleCheckout = async () => {
    if (!claims) {
      toast.error("Please log in", {
        description: "You need to be logged in to place an order.",
      });
      router.push("/auth");
      return;
    }

    if (items.length === 0) {
      toast.error("Cart is empty", {
        description: "Add some items to your cart before checking out.",
      });
      return;
    }

    setIsCheckingOut(true);

    try {
      const orderItems = items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        imprintId: item.imprintId,
      }));

      const order = await server.api.order.createOrder({ items: orderItems });

      // Set redirecting flag to prevent showing empty cart
      setIsRedirecting(true);

      // Clear cart and redirect immediately to orders page
      clearCart();

      toast.success("Order placed successfully!", {
        description: "Your order has been created and is pending payment.",
      });

      // Use replace to prevent going back to cart page
      router.replace("/orders");
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout failed", {
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const total = getTotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b px-4 backdrop-blur lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src={"/icon.png"} alt="Printly Logo" width={24} height={24} className="size-6" />
            <h1 className="font-mono text-xl font-bold">Printly</h1>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <CartButton />
          <LoggedIn>
            <Button variant="default" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </LoggedIn>
          <LoggedOut>
            <Button variant="default" asChild>
              <Link href="/auth">Login</Link>
            </Button>
          </LoggedOut>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-16 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/#products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground">
            {itemCount === 0 ? "No items in cart" : `${itemCount} ${itemCount === 1 ? "item" : "items"} in your cart`}
          </p>
        </div>

        {items.length === 0 && !isRedirecting ? (
          <EmptyCart />
        ) : isRedirecting ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-primary mb-4 h-16 w-16 animate-spin rounded-full border-4 border-current border-t-transparent" />
            <h2 className="mb-2 text-xl font-bold">Redirecting to your orders...</h2>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Cart Items</CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    Clear All
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {items.map((item) => (
                      <CartItemRow
                        key={`${item.variantId}-${item.imprintId || "no-imprint"}`}
                        item={item}
                        onUpdateQuantity={(qty) => updateQuantity(item.variantId, qty, item.imprintId)}
                        onRemove={() => removeItem(item.variantId, item.imprintId)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || items.length === 0}
                  >
                    {isCheckingOut ? "Processing..." : "Complete Order"}
                  </Button>
                </CardFooter>
              </Card>

              {!claims && (
                <p className="text-muted-foreground mt-4 text-center text-sm">
                  <Link href="/auth" className="text-primary underline">
                    Log in
                  </Link>{" "}
                  to complete your purchase
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
