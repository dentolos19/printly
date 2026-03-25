"use client";

import { LogIn, User } from "lucide-react";
import Link from "next/link";
import { CartButton } from "@/components/cart-button";
import { Button } from "@/components/ui/button";
import { LoggedIn, LoggedOut, useAuth } from "@/lib/providers/auth";

export function HeaderButtons() {
  const { claims } = useAuth();
  const isAdmin = claims?.role?.toLowerCase() === "admin";

  return (
    <div className="flex items-center gap-4">
      <CartButton />
      <div className="bg-border hidden h-6 w-px sm:block" />

      <LoggedIn>
        <Button asChild className="shadow-primary/20 rounded-full font-bold shadow-lg" variant="default">
          <Link className="flex items-center gap-2" href="/dashboard">
            <User className="size-4" />
            Dashboard
          </Link>
        </Button>
      </LoggedIn>

      <LoggedOut>
        <Button asChild className="shadow-primary/20 rounded-full px-6 font-bold shadow-lg" variant="default">
          <Link className="flex items-center gap-2" href="/auth">
            <LogIn className="size-4" />
            Join
          </Link>
        </Button>
      </LoggedOut>
    </div>
  );
}
