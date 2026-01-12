"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/providers/auth";
import { useCart } from "@/lib/providers/cart";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export function CartButton() {
  const { claims } = useAuth();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  // Only show cart button when user is logged in
  if (!claims) return null;

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/cart">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
        <span className="sr-only">Cart ({itemCount} items)</span>
      </Link>
    </Button>
  );
}
