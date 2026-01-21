"use client";

import { CartButton } from "@/components/cart-button";
import { Button } from "@/components/ui/button";
import { LoggedIn, LoggedOut, useAuth } from "@/lib/providers/auth";
import { LogIn, User } from "lucide-react";
import Link from "next/link";

export function HeaderButtons() {
  const { claims } = useAuth();
  const isAdmin = claims?.role?.toLowerCase() === "admin";

  return (
    <div className="flex items-center gap-4">
      <CartButton />
      <div className="bg-border hidden h-6 w-px sm:block" />

      <LoggedIn>
        <Button variant="default" className="shadow-primary/20 rounded-full font-bold shadow-lg" asChild>
          <Link href="/dashboard" className="flex items-center gap-2">
            <User className="size-4" />
            Dashboard
          </Link>
        </Button>
      </LoggedIn>

      <LoggedOut>
        <Button variant="ghost" className="hidden font-semibold sm:flex" asChild>
          <Link href="/auth">Sign In</Link>
        </Button>
        <Button variant="default" className="shadow-primary/20 rounded-full px-6 font-bold shadow-lg" asChild>
          <Link href="/auth" className="flex items-center gap-2">
            <LogIn className="size-4" />
            Join Printly
          </Link>
        </Button>
      </LoggedOut>
    </div>
  );
}
