"use client";

import { Link } from "@tanstack/react-router";
import { LogIn, User } from "lucide-react";
import { CartButton } from "#/components/cart-button";
import { Button } from "#/components/ui/button";
import { LoggedIn, LoggedOut, useAuth } from "#/lib/providers/auth";

export function HeaderButtons() {
  const { claims } = useAuth();
  const isAdmin = claims?.role?.toLowerCase() === "admin";

  return (
    <div className="flex items-center gap-4">
      <CartButton />
      <div className="hidden h-6 w-px bg-border sm:block" />

      <LoggedIn>
        <Button asChild className="rounded-full font-bold shadow-lg shadow-primary/20" variant="default">
          <Link className="flex items-center gap-2" to="/dashboard">
            <User className="size-4" />
            Dashboard
          </Link>
        </Button>
      </LoggedIn>

      <LoggedOut>
        <Button asChild className="rounded-full px-6 font-bold shadow-lg shadow-primary/20" variant="default">
          <Link className="flex items-center gap-2" to="/auth">
            <LogIn className="size-4" />
            Join
          </Link>
        </Button>
      </LoggedOut>
    </div>
  );
}
