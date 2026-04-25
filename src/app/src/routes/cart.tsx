"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CartButton } from "#/components/cart-button";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { LoggedIn, LoggedOut, useAuth } from "#/lib/providers/auth";
import { type CartItem, useCart } from "#/lib/providers/cart";
import { useServer } from "#/lib/providers/server";
import { ProductSizeLabels } from "#/lib/server/product";

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
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-medium">{item.productName}</h3>
        <p className="text-muted-foreground text-sm">
          {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]} • {item.color}
        </p>
        {item.imprintName && <p className="font-medium text-primary text-sm">+ Customization: {item.imprintName}</p>}
        <div className="flex items-center gap-2">
          <p className="font-medium">${item.unitPrice.toFixed(2)}</p>
          {item.customizationPrice && item.customizationPrice > 0 && (
            <span className="text-primary text-sm">+ ${item.customizationPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="h-8 w-8"
          disabled={item.quantity <= 1}
          onClick={() => onUpdateQuantity(item.quantity - 1)}
          size="icon"
          variant="outline"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <Button
          className="h-8 w-8"
          disabled={item.quantity >= item.maxStock}
          onClick={() => onUpdateQuantity(item.quantity + 1)}
          size="icon"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="w-24 text-right font-medium">${(itemPrice * item.quantity).toFixed(2)}</div>
      <Button className="text-destructive hover:text-destructive" onClick={onRemove} size="icon" variant="ghost">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ShoppingCart className="mb-4 h-16 w-16 text-muted-foreground" />
      <h2 className="mb-2 font-bold text-2xl">Your cart is empty</h2>
      <p className="mb-6 text-muted-foreground">Browse our products and add items to your cart to get started.</p>
      <Button asChild>
        <Link to="/#products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Link>
      </Button>
    </div>
  );
}

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
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
      navigate({ to: "/auth" });
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
      navigate({ to: "/orders", replace: true });
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
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 lg:px-8">
        <div className="flex items-center gap-2">
          <Link className="flex items-center gap-2" to="/">
            <Image alt="Printly Logo" className="size-6" height={24} src={"/icon.png"} width={24} />
            <h1 className="font-bold font-mono text-xl">Printly</h1>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <CartButton />
          <LoggedIn>
            <Button asChild variant="default">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </LoggedIn>
          <LoggedOut>
            <Button asChild variant="default">
              <Link to="/auth">Login</Link>
            </Button>
          </LoggedOut>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-16 lg:px-8">
        <div className="mb-6">
          <Button asChild className="mb-4" variant="ghost">
            <Link to="/#products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
          <h1 className="font-bold text-3xl">Shopping Cart</h1>
          <p className="text-muted-foreground">
            {itemCount === 0 ? "No items in cart" : `${itemCount} ${itemCount === 1 ? "item" : "items"} in your cart`}
          </p>
        </div>

        {items.length === 0 && !isRedirecting ? (
          <EmptyCart />
        ) : isRedirecting ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-current border-t-transparent text-primary" />
            <h2 className="mb-2 font-bold text-xl">Redirecting to your orders...</h2>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Cart Items</CardTitle>
                  <Button onClick={clearCart} size="sm" variant="ghost">
                    Clear All
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {items.map((item) => (
                      <CartItemRow
                        item={item}
                        key={`${item.variantId}-${item.imprintId || "no-imprint"}`}
                        onRemove={() => removeItem(item.variantId, item.imprintId)}
                        onUpdateQuantity={(qty) => updateQuantity(item.variantId, qty, item.imprintId)}
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
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={isCheckingOut || items.length === 0}
                    onClick={handleCheckout}
                    size="lg"
                  >
                    {isCheckingOut ? "Processing..." : "Complete Order"}
                  </Button>
                </CardFooter>
              </Card>

              {!claims && (
                <p className="mt-4 text-center text-muted-foreground text-sm">
                  <Link className="text-primary underline" to="/auth">
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
