"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useServer } from "@/lib/providers/server";
import type { Design } from "@/lib/server/design";
import type { OrderSummaryResponse, UserOrderStatsResponse } from "@/lib/server/order";
import { OrderStatusColors, OrderStatusLabels } from "@/lib/server/order";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Box,
  Clock,
  CreditCard,
  FileImage,
  Package,
  Palette,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type DesignWithPreview = Design & {
  preview?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { api } = useServer();

  const [stats, setStats] = useState<UserOrderStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [recentOrders, setRecentOrders] = useState<OrderSummaryResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [recentDesigns, setRecentDesigns] = useState<DesignWithPreview[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await api.order.getMyOrderStats();
      setStats(data);
    } catch (error) {
      toast.error("Failed to load order statistics");
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  }, [api.order]);

  // Load recent orders
  const loadRecentOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const data = await api.order.getMyOrders();
      setRecentOrders(data.slice(0, 5));
    } catch (error) {
      toast.error("Failed to load recent orders");
      console.error(error);
    } finally {
      setOrdersLoading(false);
    }
  }, [api.order]);

  // Load recent designs
  const loadRecentDesigns = useCallback(async () => {
    try {
      setDesignsLoading(true);
      const data = await api.design.getDesigns();

      const designsWithPreviews = await Promise.all(
        data.slice(0, 4).map(async (design) => {
          let preview: string | undefined;

          if (design.coverId) {
            try {
              const blob = await api.design.getDesignCover(design.id);
              preview = URL.createObjectURL(blob);
            } catch (error) {
              console.error("Failed to load cover:", error);
            }
          }

          return { ...design, preview };
        }),
      );

      setRecentDesigns(designsWithPreviews);
    } catch (error) {
      toast.error("Failed to load recent designs");
      console.error(error);
    } finally {
      setDesignsLoading(false);
    }
  }, [api.design]);

  useEffect(() => {
    loadStats();
    loadRecentOrders();
    loadRecentDesigns();
  }, [loadStats, loadRecentOrders, loadRecentDesigns]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Welcome back! Here's what's happening with your orders and designs.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Package className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeOrders ?? 0}</div>
                <p className="text-muted-foreground mt-1 text-xs">Orders in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
                <CreditCard className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingPayment ?? 0}</div>
                <p className="text-muted-foreground mt-1 text-xs">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                <ShoppingBag className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.completedOrders ?? 0}</div>
                <p className="text-muted-foreground mt-1 text-xs">Successfully delivered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalSpent ?? 0)}</div>
                <p className="text-muted-foreground mt-1 text-xs">All time spending</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/designer/new">
                <Palette className="h-6 w-6" />
                <span className="font-semibold">Create Design</span>
                <span className="text-muted-foreground text-xs">Start a new design</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/imprinter/new">
                <Box className="h-6 w-6" />
                <span className="font-semibold">Create Imprint</span>
                <span className="text-muted-foreground text-xs">Configure 3D product</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/products">
                <ShoppingBag className="h-6 w-6" />
                <span className="font-semibold">Browse Products</span>
                <span className="text-muted-foreground text-xs">Explore catalog</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
              <Link href="/orders">
                <Package className="h-6 w-6" />
                <span className="font-semibold">View Orders</span>
                <span className="text-muted-foreground text-xs">Track all orders</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Designs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Recent Designs
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/library2">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {designsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-16 w-16 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentDesigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-primary/10 mb-4 rounded-full p-3">
                  <FileImage className="text-primary h-6 w-6" />
                </div>
                <p className="text-muted-foreground mb-4 text-center text-sm">You haven't created any designs yet</p>
                <Button asChild size="sm">
                  <Link href="/designer/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Design
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDesigns.map((design) => (
                  <div
                    key={design.id}
                    className="hover:bg-accent group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                    onClick={() => router.push(`/designer/${design.id}`)}
                  >
                    <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded">
                      {design.preview ? (
                        <img
                          src={design.preview}
                          alt={design.name}
                          className="size-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <FileImage className="text-muted-foreground h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{design.name}</p>
                      <p className="text-muted-foreground text-xs">Updated {formatDate(design.updatedAt)}</p>
                    </div>
                    <ArrowRight className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/orders">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-primary/10 mb-4 rounded-full p-3">
                  <ShoppingBag className="text-primary h-6 w-6" />
                </div>
                <p className="text-muted-foreground mb-4 text-center text-sm">You haven't placed any orders yet</p>
                <Button asChild size="sm">
                  <Link href="/products">
                    <Plus className="mr-2 h-4 w-4" />
                    Browse Products
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="hover:bg-accent group flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-muted-foreground truncate text-sm font-medium">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            OrderStatusColors[order.status],
                          )}
                        >
                          {OrderStatusLabels[order.status]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-muted-foreground text-xs">
                          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                        </p>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-muted-foreground text-xs">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                      <ArrowRight className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
