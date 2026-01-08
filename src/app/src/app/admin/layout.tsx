"use client";

import AccessDenied from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/providers/auth";
import { cn } from "@/lib/utils";
import { Box, Home, Layers, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/variants", label: "Variants", icon: Layers },
  { href: "/admin/inventory", label: "Inventory", icon: Box },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
];

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { claims } = useAuth();

  if (claims?.role?.toLowerCase() !== "admin") {
    return <AccessDenied className={"h-dvh"} />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="bg-muted/30 w-64 border-r p-4">
        <div className="mb-6">
          <Link href="/" className="mb-2 flex items-center gap-2">
            <img src="/icon.png" alt="Printly" className="size-6" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </Link>
          <p className="text-muted-foreground text-sm">Manage products & inventory</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-2", isActive && "bg-secondary")}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
