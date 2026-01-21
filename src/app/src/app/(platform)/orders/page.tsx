"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServer } from "@/lib/providers/server";
import {
  OrderResponse,
  OrderSummaryResponse,
  OrderStatus,
  OrderStatusColors,
  OrderStatusLabels,
} from "@/lib/server/order";
import { ProductSizeLabels } from "@/lib/server/product";
import { OrderProgressTracker } from "@/components/order-progress-tracker";
import { CheckCircle2, Clock, CreditCard, Eye, Loader2, Package, ShoppingBag, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const StatusIcons: Record<OrderStatus, React.ElementType> = {
  [OrderStatus.PendingPayment]: Clock,
  [OrderStatus.Paid]: CreditCard,
  [OrderStatus.Processing]: Package,
  [OrderStatus.Shipped]: Truck,
  [OrderStatus.Delivered]: CheckCircle2,
  [OrderStatus.Cancelled]: XCircle,
};

function OrdersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-6 w-32" />
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrderCard({
  order,
  onViewDetails,
  onCancel,
  onPay,
  isPaying,
}: {
  order: OrderSummaryResponse;
  onViewDetails: () => void;
  onCancel: () => void;
  onPay: () => void;
  isPaying: boolean;
}) {
  const StatusIcon = StatusIcons[order.status];
  const canCancel = order.status === OrderStatus.PendingPayment;
  const canPay = order.status === OrderStatus.PendingPayment;

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-full p-2 ${order.status === OrderStatus.Cancelled ? "bg-red-100" : order.status === OrderStatus.Delivered ? "bg-green-100" : "bg-primary/10"}`}
            >
              <StatusIcon
                className={`h-4 w-4 ${order.status === OrderStatus.Cancelled ? "text-red-600" : order.status === OrderStatus.Delivered ? "text-green-600" : "text-primary"}`}
              />
            </div>
            <div>
              <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <Badge className={OrderStatusColors[order.status]}>{OrderStatusLabels[order.status]}</Badge>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">
                {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
              </p>
              <p className="text-xl font-bold">${order.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            {canPay && (
              <Button size="sm" onClick={onPay} disabled={isPaying} className="flex-1">
                <CreditCard className="mr-2 h-4 w-4" />
                {isPaying ? "Processing..." : "Pay Now"}
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="text-destructive hover:text-destructive">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
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
  const StatusIcon = order ? StatusIcons[order.status] : Package;

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
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full p-2 ${order.status === OrderStatus.Cancelled ? "bg-red-100" : order.status === OrderStatus.Delivered ? "bg-green-100" : "bg-primary/10"}`}
                >
                  <StatusIcon
                    className={`h-5 w-5 ${order.status === OrderStatus.Cancelled ? "text-red-600" : order.status === OrderStatus.Delivered ? "text-green-600" : "text-primary"}`}
                  />
                </div>
                <div>
                  <DialogTitle>Order #{order.id.slice(0, 8)}</DialogTitle>
                  <DialogDescription>
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Order Progress Tracker */}
              <OrderProgressTracker status={order.status} />

              <div className="space-y-3">
                <h4 className="font-medium">Order Items</h4>
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                        <Package className="text-muted-foreground h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-muted-foreground text-sm">
                          {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]} • {item.color}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="bg-muted/50 space-y-2 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CancelConfirmDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  order: OrderSummaryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel order #{order.id.slice(0, 8)}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Keep Order
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Cancelling..." : "Cancel Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted mb-4 rounded-full p-6">
        <ShoppingBag className="text-muted-foreground h-12 w-12" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">No orders yet</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        When you place an order, it will appear here. Start shopping to see your orders!
      </p>
      <Button asChild>
        <Link href="/#products">Browse Products</Link>
      </Button>
    </div>
  );
}

export default function OrdersPage() {
  const server = useServer();
  const [orders, setOrders] = useState<OrderSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummaryResponse | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const fetchOrders = async () => {
    try {
      const data = await server.api.order.getMyOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders", {
        description: "Please try refreshing the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [server]);

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case "active":
        return orders.filter((o) =>
          [OrderStatus.PendingPayment, OrderStatus.Paid, OrderStatus.Processing, OrderStatus.Shipped].includes(
            o.status,
          ),
        );
      case "completed":
        return orders.filter((o) => o.status === OrderStatus.Delivered);
      case "cancelled":
        return orders.filter((o) => o.status === OrderStatus.Cancelled);
      default:
        return orders;
    }
  }, [orders, activeTab]);

  const orderCounts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter((o) =>
        [OrderStatus.PendingPayment, OrderStatus.Paid, OrderStatus.Processing, OrderStatus.Shipped].includes(o.status),
      ).length,
      completed: orders.filter((o) => o.status === OrderStatus.Delivered).length,
      cancelled: orders.filter((o) => o.status === OrderStatus.Cancelled).length,
    }),
    [orders],
  );

  const handleViewDetails = async (order: OrderSummaryResponse) => {
    setSelectedOrder(order);
    setIsLoadingDetails(true);
    setDetailsOpen(true);

    try {
      const details = await server.api.order.getMyOrder(order.id);
      setSelectedOrderDetails(details);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      toast.error("Failed to load order details", {
        description: "Please try again.",
      });
      setDetailsOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCancelClick = (order: OrderSummaryResponse) => {
    setSelectedOrder(order);
    setCancelOpen(true);
  };

  const handlePayOrder = async (order: OrderSummaryResponse) => {
    setIsPaying(order.id);
    try {
      await server.api.order.payMyOrder(order.id);
      toast.success("Payment successful!", {
        description: `Order #${order.id.slice(0, 8)} has been marked as paid.`,
      });
      fetchOrders();
    } catch (error) {
      console.error("Failed to process payment:", error);
      toast.error("Payment failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsPaying(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!selectedOrder) return;

    setIsCancelling(true);
    try {
      await server.api.order.cancelMyOrder(selectedOrder.id);
      toast.success("Order cancelled", {
        description: `Order #${selectedOrder.id.slice(0, 8)} has been cancelled.`,
      });
      setCancelOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error("Failed to cancel order", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">Track and manage all your orders</p>
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All{" "}
              <Badge variant="secondary" className="ml-2">
                {orderCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active{" "}
              <Badge variant="secondary" className="ml-2">
                {orderCounts.active}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed{" "}
              <Badge variant="secondary" className="ml-2">
                {orderCounts.completed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled{" "}
              <Badge variant="secondary" className="ml-2">
                {orderCounts.cancelled}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="text-muted-foreground mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">No {activeTab === "all" ? "" : activeTab} orders found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={() => handleViewDetails(order)}
                    onCancel={() => handleCancelClick(order)}
                    onPay={() => handlePayOrder(order)}
                    isPaying={isPaying === order.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <OrderDetailsDialog
        order={selectedOrderDetails}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isLoading={isLoadingDetails}
      />

      <CancelConfirmDialog
        order={selectedOrder}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />
    </div>
  );
}
