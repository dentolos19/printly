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
}: {
  title: string;
  value: string | number;
  icon: React.ElementType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </CardContent>
    </Card>
  );
}

function RecentOrderCard({ order, onClick }: { order: OrderSummaryResponse; onClick: () => void }) {
  return (
    <Card className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={onClick}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
            <Package className="text-primary h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
            <p className="text-muted-foreground text-sm">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"} • ${order.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={OrderStatusColors[order.status]}>{OrderStatusLabels[order.status]}</Badge>
          <span className="text-muted-foreground text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
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
      <DialogContent className="max-w-lg">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-2">Loading order details...</p>
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">Order details not available</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Order #{order.id.slice(0, 8)}</DialogTitle>
              <DialogDescription>
                Placed on{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Order Progress Tracker */}
              <OrderProgressTracker status={order.status} />

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Order Items</h4>
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                        <Package className="text-muted-foreground h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]}, {item.color}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
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
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Orders"
          value={orderStats?.activeOrders ?? 0}
          icon={ShoppingBag}
          description="Orders in progress"
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
          description="Successfully delivered"
          loading={loadingStats}
        />
        <StatCard
          title="Total Spent"
          value={`$${(orderStats?.totalSpent ?? 0).toFixed(2)}`}
          icon={DollarSign}
          description="Lifetime purchases"
          loading={loadingStats}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Item variant="outline" asChild>
            <Link href="/designer/new">
              <ItemMedia>
                <PlusIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Create New Design</ItemTitle>
                <ItemDescription>Build a new design for anything!</ItemDescription>
              </ItemContent>
              <ItemActions />
            </Link>
          </Item>
          <Item variant="outline" asChild>
            <Link href="/designs">
              <ItemMedia>
                <ImageIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Manage My Assets</ItemTitle>
                <ItemDescription>Manage your design assets and resources.</ItemDescription>
              </ItemContent>
              <ItemActions />
            </Link>
          </Item>
          <Item variant="outline" asChild>
            <Link href="/chat">
              <ItemMedia>
                <PhoneIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Contact Support</ItemTitle>
                <ItemDescription>Get help and support for your account.</ItemDescription>
              </ItemContent>
              <ItemActions />
            </Link>
          </Item>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest orders</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingOrders ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[72px] w-full" />)
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <RecentOrderCard key={order.id} order={order} onClick={() => handleViewOrderDetails(order)} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingBag className="text-muted-foreground mb-2 h-10 w-10" />
                <p className="text-muted-foreground">No orders yet</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/#products">Browse Products</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Designs */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Designs</CardTitle>
              <CardDescription>Your latest design projects</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/designs">View All</Link>
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
                <Item key={design.id} variant="outline" asChild>
                  <Link href={`/designer/${design.id}`}>
                    <ItemMedia>
                      <FileTextIcon />
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileTextIcon className="text-muted-foreground mb-2 h-10 w-10" />
                <p className="text-muted-foreground">No designs yet</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/designer/new">Create Your First Design</Link>
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
