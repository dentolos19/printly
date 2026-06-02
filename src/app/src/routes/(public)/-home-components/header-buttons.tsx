import { Link } from "@tanstack/react-router";
import { LogIn, User } from "lucide-react";

import { CartButton } from "#/components/cart-button";
import { Button } from "#/components/ui/button";
import { LoggedIn, LoggedOut } from "#/lib/providers/auth";

export function HeaderButtons() {
  return (
    <div className="flex items-center gap-4">
      <CartButton />
      <div className="bg-border hidden h-6 w-px sm:block" />

      <LoggedIn>
        <Button asChild className="shadow-primary/20 rounded-full font-bold shadow-lg" variant="default">
          <Link className="flex items-center gap-2" to="/dashboard">
            <User className="size-4" />
            Dashboard
          </Link>
        </Button>
      </LoggedIn>

      <LoggedOut>
        <Button asChild className="shadow-primary/20 rounded-full px-6 font-bold shadow-lg" variant="default">
          <Link className="flex items-center gap-2" to="/auth">
            <LogIn className="size-4" />
            Join
          </Link>
        </Button>
      </LoggedOut>
    </div>
  );
}
