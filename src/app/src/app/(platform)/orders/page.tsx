"use client";

import { OrderProgressTracker } from "@/components/order-progress-tracker";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import {
  OrderResponse,
  OrderStatus,
  OrderStatusColors,
  OrderStatusLabels,
  OrderSummaryResponse,
} from "@/lib/server/order";
import { ProductSizeLabels } from "@/lib/server/product";
import {
  getAvailableRefundReasons,
  RefundReason,
  RefundReasonLabels,
  RefundResponse,
  RefundStatus,
  RefundStatusColors,
  RefundStatusLabels,
} from "@/lib/server/refund";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  MessageSquare,
  Package,
  RefreshCcw,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const StatusIcons: Record<OrderStatus, React.ElementType<{ className?: string }>> = {
  [OrderStatus.PendingPayment]: Clock,
  [OrderStatus.Paid]: CreditCard,
  [OrderStatus.Processing]: Package,
  [OrderStatus.Shipped]: Truck,
  [OrderStatus.Delivered]: CheckCircle2,
  [OrderStatus.Cancelled]: XCircle,
  [OrderStatus.RefundRequested]: RotateCcw,
  [OrderStatus.RefundApproved]: RefreshCcw,
  [OrderStatus.Refunded]: CheckCircle2,
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
  refund,
  onRequestRefund,
  isLoadingRefund,
}: {
  order: OrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  refund?: RefundResponse | null;
  onRequestRefund?: () => void;
  isLoadingRefund?: boolean;
}) {
  const StatusIcon = order ? StatusIcons[order.status] : Package;

  // Check if order is eligible for refund
  const canRequestRefund =
    order && [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered].includes(order.status) && !refund;

  // Check if there's an active refund request
  const hasActiveRefund =
    refund &&
    [RefundStatus.Requested, RefundStatus.UnderReview, RefundStatus.Approved, RefundStatus.Processing].includes(
      refund.status,
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
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

              {/* Refund Status Section */}
              {refund && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Refund Request</span>
                    </div>
                    <Badge className={RefundStatusColors[refund.status]}>{RefundStatusLabels[refund.status]}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Amount: ${refund.requestedAmount.toFixed(2)}</p>
                    <p>Reason: {RefundReasonLabels[refund.reason]}</p>
                    {refund.approvedAmount && (
                      <p className="font-medium">Approved Amount: ${refund.approvedAmount.toFixed(2)}</p>
                    )}
                    {refund.adminNotes && <p className="mt-1 italic">Admin: {refund.adminNotes}</p>}
                  </div>
                  {hasActiveRefund && refund.conversationId && (
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href={`/messages?conversation=${refund.conversationId}`}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Continue in Chat
                      </Link>
                    </Button>
                  )}
                </div>
              )}

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

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {canRequestRefund && (
                <Button
                  variant="outline"
                  onClick={onRequestRefund}
                  disabled={isLoadingRefund}
                  className="w-full sm:w-auto"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isLoadingRefund ? "Loading..." : "Request Refund"}
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
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

function RefundRequestDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  order: OrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { requestedAmount: number; reason: RefundReason; customerNotes?: string }) => void;
  isLoading: boolean;
}) {
  const [requestedAmount, setRequestedAmount] = useState<string>("");
  const [reason, setReason] = useState<RefundReason | "">("");
  const [customerNotes, setCustomerNotes] = useState<string>("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open && order) {
      setRequestedAmount(order.totalAmount.toFixed(2));
      setReason("");
      setCustomerNotes("");
    }
  }, [open, order]);

  if (!order) return null;

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Please select a reason for your refund request");
      return;
    }

    const amount = parseFloat(requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    if (amount > order.totalAmount) {
      toast.error("Refund amount cannot exceed the order total");
      return;
    }

    onConfirm({
      requestedAmount: amount,
      reason: reason as RefundReason,
      customerNotes: customerNotes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Request a refund for order #{order.id.slice(0, 8)}. Our team will review your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Refund Amount ($)</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={order.totalAmount}
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              placeholder={`Max: $${order.totalAmount.toFixed(2)}`}
            />
            <p className="text-muted-foreground text-xs">Order total: ${order.totalAmount.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason for Refund *</Label>
            <Select value={reason.toString()} onValueChange={(v) => setReason(parseInt(v) as RefundReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRefundReasons(order.status).map((reasonValue) => (
                  <SelectItem key={reasonValue} value={reasonValue.toString()}>
                    {RefundReasonLabels[reasonValue]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-notes">Additional Details (Optional)</Label>
            <Textarea
              id="customer-notes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Please provide any additional details about your refund request..."
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <p className="font-medium">What happens next?</p>
            </div>
            <ul className="mt-1 list-inside list-disc text-xs">
              <li>A support chat will be created for this refund request</li>
              <li>You can discuss the refund with our support team via chat</li>
              <li>Our team will review your request within 1-2 business days</li>
              <li>Once approved, the refund will be processed to your original payment method</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason}>
            {isLoading ? "Submitting..." : "Submit Request"}
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

  // Refund state
  const [refundOpen, setRefundOpen] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [selectedOrderRefund, setSelectedOrderRefund] = useState<RefundResponse | null>(null);
  const [isLoadingRefund, setIsLoadingRefund] = useState(false);

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
    setSelectedOrderRefund(null);
    setDetailsOpen(true);

    try {
      const details = await server.api.order.getMyOrder(order.id);
      setSelectedOrderDetails(details);

      // Also try to fetch refund info if order is eligible
      if ([OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered].includes(order.status)) {
        setIsLoadingRefund(true);
        try {
          const refund = await server.api.refund.getRefundByOrder(order.id);
          setSelectedOrderRefund(refund);
        } catch {
          // No refund exists for this order, which is fine
          setSelectedOrderRefund(null);
        } finally {
          setIsLoadingRefund(false);
        }
      }
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

  const handleRequestRefund = () => {
    setRefundOpen(true);
  };

  const handleRefundSubmit = async (data: {
    requestedAmount: number;
    reason: RefundReason;
    customerNotes?: string;
  }) => {
    if (!selectedOrderDetails) return;

    setIsRequestingRefund(true);
    try {
      const refund = await server.api.refund.createRefundRequest({
        orderId: selectedOrderDetails.id,
        requestedAmount: data.requestedAmount,
        reason: data.reason,
        customerNotes: data.customerNotes,
      });

      setSelectedOrderRefund(refund);
      setRefundOpen(false);

      // Re-fetch orders to update the status
      fetchOrders();

      toast.success("Refund request submitted", {
        description: refund.conversationId
          ? "A support chat has been created for your refund request."
          : "Our team will review your request and get back to you soon.",
        action: refund.conversationId
          ? {
              label: "Open Chat",
              onClick: () => {
                window.location.href = `/messages?conversation=${refund.conversationId}`;
              },
            }
          : undefined,
      });
    } catch (error) {
      console.error("Failed to submit refund request:", error);
      toast.error("Failed to submit refund request", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsRequestingRefund(false);
    }
  };

  const handlePayOrder = async (order: OrderSummaryResponse) => {
    setIsPaying(order.id);
    try {
      // Create Stripe checkout session and redirect
      const { checkoutUrl } = await server.api.payment.createCheckoutSession(order.id);
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      toast.error("Payment failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
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
        refund={selectedOrderRefund}
        onRequestRefund={handleRequestRefund}
        isLoadingRefund={isLoadingRefund}
      />

      <CancelConfirmDialog
        order={selectedOrder}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />

      <RefundRequestDialog
        order={selectedOrderDetails}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onConfirm={handleRefundSubmit}
        isLoading={isRequestingRefund}
      />
    </div>
  );
}
