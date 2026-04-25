"use client";

import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Button } from "#/components/ui/button";
import { useAuth } from "#/lib/providers/auth";
import { useCart } from "#/lib/providers/cart";

export function CartButton() {
  const { claims } = useAuth();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  // Only show cart button when user is logged in
  if (!claims) return null;

  return (
    <Button asChild className="relative" size="icon" variant="ghost">
      <Link to="/cart">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
        <span className="sr-only">Cart ({itemCount} items)</span>
      </Link>
    </Button>
  );
}
