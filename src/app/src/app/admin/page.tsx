"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useServer } from "@/lib/providers/server";
import { AlertTriangle, Box, Layers, Package, PackageX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type DashboardStats = {
  totalProducts: number;
  activeProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export default function Page() {
  const { api } = useServer();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [products, stockInfo] = await Promise.all([api.product.getProducts(), api.inventory.getTotalStock()]);

      setStats({
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.isActive).length,
        totalVariants: stockInfo.totalVariants,
        totalStock: stockInfo.totalStock,
        lowStockCount: stockInfo.lowStockCount,
        outOfStockCount: stockInfo.outOfStockCount,
      });
    } catch (error) {
      toast.error("Failed to load dashboard statistics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api.product, api.inventory]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const statCards = [
    {
      title: "Total Products",
      value: stats?.totalProducts ?? 0,
      description: `${stats?.activeProducts ?? 0} active`,
      icon: Package,
      href: "/admin/products",
      color: "text-blue-500",
    },
    {
      title: "Total Variants",
      value: stats?.totalVariants ?? 0,
      description: "Product variations",
      icon: Layers,
      href: "/admin/variants",
      color: "text-purple-500",
    },
    {
      title: "Total Stock",
      value: stats?.totalStock ?? 0,
      description: "Items in inventory",
      icon: Box,
      href: "/admin/inventory",
      color: "text-green-500",
    },
    {
      title: "Low Stock",
      value: stats?.lowStockCount ?? 0,
      description: "Items below reorder level",
      icon: AlertTriangle,
      href: "/admin/inventory?filter=low-stock",
      color: "text-yellow-500",
    },
    {
      title: "Out of Stock",
      value: stats?.outOfStockCount ?? 0,
      description: "Items with zero quantity",
      icon: PackageX,
      href: "/admin/inventory?filter=out-of-stock",
      color: "text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your product inventory</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`size-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
                    <CardDescription>{card.description}</CardDescription>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
