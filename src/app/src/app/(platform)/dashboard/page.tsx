"use client";

import { OrderProgressTracker } from "@/components/order-progress-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import type { Design } from "@/lib/server/design";
import {
  OrderResponse,
  OrderStatusColors,
  OrderStatusLabels,
  OrderSummaryResponse,
  UserOrderStatsResponse,
} from "@/lib/server/order";
import { ProductSizeLabels } from "@/lib/server/product";
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileTextIcon,
  ImageIcon,
  Loader2,
  Package,
  PhoneIcon,
  PlusIcon,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType<{ className?: string }>;
  description?: string;
  loading?: boolean;
  trend?: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
      <div className="from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        <div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 transition-colors">
          <Icon className="text-primary h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            {(description || trend) && (
              <div className="flex items-center gap-2">
                {description && <p className="text-muted-foreground text-xs">{description}</p>}
                {trend && (
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    {trend}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentOrderCard({ order, onClick }: { order: OrderSummaryResponse; onClick: () => void }) {
  return (
    <Card
      className="group hover:border-primary/20 relative cursor-pointer overflow-hidden transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="from-primary/5 absolute inset-0 bg-linear-to-r via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="relative flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 group-hover:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
            <Package className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">Order #{order.id.slice(0, 8)}</p>
            <p className="text-muted-foreground text-sm">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"} •{" "}
              <span className="text-foreground font-medium">${order.totalAmount.toFixed(2)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={OrderStatusColors[order.status]}>{OrderStatusLabels[order.status]}</Badge>
          <span className="text-muted-foreground text-xs">
            {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
  isLoading,
}: {
  order: OrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-3 text-sm">Loading order details...</p>
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="text-muted-foreground/50 h-12 w-12" />
            <p className="text-muted-foreground mt-3">Order details not available</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl">Order #{order.id.slice(0, 8)}</DialogTitle>
                  <DialogDescription className="mt-2">
                    Placed on{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </DialogDescription>
                </div>
                <Badge className={OrderStatusColors[order.status]}>{OrderStatusLabels[order.status]}</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <OrderProgressTracker status={order.status} />

              <Separator />

              <div className="space-y-3">
                <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Order Items</h4>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-muted/30 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-4 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-background flex h-12 w-12 items-center justify-center rounded-lg shadow-sm">
                          <Package className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {item.color} • Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="bg-muted/30 rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${order.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="text-primary font-bold">${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  const { isInitialized } = useAuth();
  const { api } = useServer();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [orderStats, setOrderStats] = useState<UserOrderStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentOrders, setRecentOrders] = useState<OrderSummaryResponse[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    // Fetch designs
    api.design
      .getDesigns()
      .then((data) => {
        setDesigns(data.slice(0, 5));
      })
      .catch((error) => {
        console.error("Failed to load designs:", error);
      })
      .finally(() => {
        setLoadingDesigns(false);
      });

    // Fetch order stats
    api.order
      .getMyOrderStats()
      .then((data) => {
        setOrderStats(data);
      })
      .catch((error) => {
        console.error("Failed to load order stats:", error);
      })
      .finally(() => {
        setLoadingStats(false);
      });

    // Fetch recent orders
    api.order
      .getMyOrders()
      .then((data) => {
        setRecentOrders(data.slice(0, 5));
      })
      .catch((error) => {
        console.error("Failed to load orders:", error);
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  }, [api, isInitialized]);

  const handleViewOrderDetails = async (order: OrderSummaryResponse) => {
    setIsLoadingDetails(true);
    setDetailsOpen(true);

    try {
      const details = await api.order.getMyOrder(order.id);
      setSelectedOrder(details);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      toast.error("Failed to load order details");
      setDetailsOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-lg">Welcome back! Here's what's happening with your orders.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Orders"
          value={orderStats?.activeOrders ?? 0}
          icon={ShoppingBag}
          description="In progress"
          loading={loadingStats}
        />
        <StatCard
          title="Pending Payment"
          value={orderStats?.pendingPayment ?? 0}
          icon={CreditCard}
          description="Awaiting payment"
          loading={loadingStats}
        />
        <StatCard
          title="Completed Orders"
          value={orderStats?.completedOrders ?? 0}
          icon={CheckCircle2}
          description="Delivered"
          loading={loadingStats}
        />
        <StatCard
          title="Total Spent"
          value={`$${(orderStats?.totalSpent ?? 0).toFixed(2)}`}
          icon={DollarSign}
          description="All time"
          loading={loadingStats}
        />
      </div>

      {/* Quick Actions */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Quick Actions</CardTitle>
          <CardDescription className="text-base">Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Item
            variant="outline"
            className="group hover:border-primary relative overflow-hidden transition-all hover:shadow-lg"
            asChild
          >
            <Link href="/designer/new">
              <div className="from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <ItemMedia className="relative">
                <PlusIcon className="transition-transform group-hover:scale-110" />
              </ItemMedia>
              <ItemContent className="relative">
                <ItemTitle>Create New Design</ItemTitle>
                <ItemDescription>Build a new design for anything!</ItemDescription>
              </ItemContent>
              <ItemActions className="relative" />
            </Link>
          </Item>
          <Item
            variant="outline"
            className="group hover:border-primary relative overflow-hidden transition-all hover:shadow-lg"
            asChild
          >
            <Link href="/library">
              <div className="from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <ItemMedia className="relative">
                <ImageIcon className="transition-transform group-hover:scale-110" />
              </ItemMedia>
              <ItemContent className="relative">
                <ItemTitle>Manage Library</ItemTitle>
                <ItemDescription>Access your designs, imprints, and assets.</ItemDescription>
              </ItemContent>
              <ItemActions className="relative" />
            </Link>
          </Item>
          <Item
            variant="outline"
            className="group hover:border-primary relative overflow-hidden transition-all hover:shadow-lg"
            asChild
          >
            <Link href="/chat">
              <div className="from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <ItemMedia className="relative">
                <PhoneIcon className="transition-transform group-hover:scale-110" />
              </ItemMedia>
              <ItemContent className="relative">
                <ItemTitle>Contact Support</ItemTitle>
                <ItemDescription>Get help and support for your account.</ItemDescription>
              </ItemContent>
              <ItemActions className="relative" />
            </Link>
          </Item>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Recent Orders</CardTitle>
              <CardDescription>Track your latest purchases</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/orders">
                View All
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingOrders ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <RecentOrderCard key={order.id} order={order} onClick={() => handleViewOrderDetails(order)} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <ShoppingBag className="text-primary h-8 w-8" />
                </div>
                <p className="mt-3 font-medium">No orders yet</p>
                <p className="text-muted-foreground mt-1 text-sm">Start shopping to see your orders here</p>
                <Button asChild variant="default" className="mt-4">
                  <Link href="/#products">Browse Products</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Designs */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Recent Designs</CardTitle>
              <CardDescription>Continue your creative work</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/library">
                View All
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingDesigns ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Item key={i} variant="outline">
                  <ItemMedia>
                    <Skeleton className="size-full" />
                  </ItemMedia>
                  <ItemContent>
                    <Skeleton className="mb-2 h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </ItemContent>
                </Item>
              ))
            ) : designs.length > 0 ? (
              designs.map((design) => (
                <Item
                  key={design.id}
                  variant="outline"
                  className="group hover:border-primary transition-all hover:shadow-md"
                  asChild
                >
                  <Link href={`/designer/${design.id}`}>
                    <ItemMedia className="bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FileTextIcon className="text-primary" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{design.name}</ItemTitle>
                      <ItemDescription>{design.description || "No description"}</ItemDescription>
                    </ItemContent>
                    <ItemActions />
                  </Link>
                </Item>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <FileTextIcon className="text-primary h-8 w-8" />
                </div>
                <p className="mt-3 font-medium">No designs yet</p>
                <p className="text-muted-foreground mt-1 text-sm">Create your first design to get started</p>
                <Button asChild variant="default" className="mt-4">
                  <Link href="/designer/new">Create Design</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isLoading={isLoadingDetails}
      />
    </div>
  );
}
