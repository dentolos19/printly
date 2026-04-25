"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  Package,
  Paintbrush,
  RefreshCcw,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrderProgressTracker } from "#/components/order-progress-tracker";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Textarea } from "#/components/ui/textarea";
import { useServer } from "#/lib/providers/server";
import {
  type OrderResponse,
  OrderStatus,
  OrderStatusColors,
  OrderStatusLabels,
  type OrderSummaryResponse,
} from "#/lib/server/order";
import { ProductSizeLabels } from "#/lib/server/product";
import {
  getAvailableRefundReasons,
  type RefundReason,
  RefundReasonLabels,
  type RefundResponse,
  RefundStatus,
  RefundStatusColors,
  RefundStatusLabels,
} from "#/lib/server/refund";

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
              className={`rounded-full p-2 ${order.status === OrderStatus.Cancelled ? "bg-red-100 dark:bg-red-900/50" : order.status === OrderStatus.Delivered ? "bg-green-100 dark:bg-green-900/50" : "bg-primary/10"}`}
            >
              <StatusIcon
                className={`h-4 w-4 ${order.status === OrderStatus.Cancelled ? "text-red-600 dark:text-red-400" : order.status === OrderStatus.Delivered ? "text-green-600 dark:text-green-400" : "text-primary"}`}
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
              <p className="font-bold text-xl">${order.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" onClick={onViewDetails} size="sm" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            {canPay && (
              <Button className="flex-1" disabled={isPaying} onClick={onPay} size="sm">
                <CreditCard className="mr-2 h-4 w-4" />
                {isPaying ? "Processing..." : "Pay Now"}
              </Button>
            )}
            {canCancel && (
              <Button className="text-destructive hover:text-destructive" onClick={onCancel} size="sm" variant="ghost">
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading order details...</p>
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
                  className={`rounded-full p-2 ${order.status === OrderStatus.Cancelled ? "bg-red-100 dark:bg-red-900/50" : order.status === OrderStatus.Delivered ? "bg-green-100 dark:bg-green-900/50" : "bg-primary/10"}`}
                >
                  <StatusIcon
                    className={`h-5 w-5 ${order.status === OrderStatus.Cancelled ? "text-red-600 dark:text-red-400" : order.status === OrderStatus.Delivered ? "text-green-600 dark:text-green-400" : "text-primary"}`}
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
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-300">Refund Request</span>
                    </div>
                    <Badge className={RefundStatusColors[refund.status]}>{RefundStatusLabels[refund.status]}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                    <p>Amount: ${refund.requestedAmount.toFixed(2)}</p>
                    <p>Reason: {RefundReasonLabels[refund.reason]}</p>
                    {refund.approvedAmount && (
                      <p className="font-medium">Approved Amount: ${refund.approvedAmount.toFixed(2)}</p>
                    )}
                    {refund.adminNotes && <p className="mt-1 italic">Admin: {refund.adminNotes}</p>}
                  </div>
                  {hasActiveRefund && refund.conversationId && (
                    <Button asChild className="mt-2" size="sm" variant="outline">
                      <Link search={{ conversation: refund.conversationId }} to="/messages">
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
                  <div className="rounded-lg border p-3" key={item.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
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
                    {/* Imprint Info */}
                    {item.imprintId && (
                      <div className="mt-2 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 dark:border-blue-800 dark:bg-blue-950/50">
                        <Paintbrush className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="flex-1 text-blue-700 text-sm dark:text-blue-300">
                          Custom Design: {item.imprintName || "Unnamed"}
                          {item.customizationPrice > 0 && (
                            <span className="ml-1 text-blue-600 dark:text-blue-400">
                              (+${item.customizationPrice.toFixed(2)})
                            </span>
                          )}
                        </span>
                        <Link
                          className="text-blue-600 text-xs hover:underline dark:text-blue-400"
                          href={`/imprinter/${item.imprintId}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600 dark:text-green-400">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button asChild className="w-full sm:w-auto" variant="default">
                <Link params={{ id: order.id }} to="/orders/$id">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Link>
              </Button>
              {canRequestRefund && (
                <Button
                  className="w-full sm:w-auto"
                  disabled={isLoadingRefund}
                  onClick={onRequestRefund}
                  variant="outline"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isLoadingRefund ? "Loading..." : "Request Refund"}
                </Button>
              )}
              <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)} variant="outline">
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel order #{order.id.slice(0, 8)}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={isLoading} onClick={() => onOpenChange(false)} variant="outline">
            Keep Order
          </Button>
          <Button disabled={isLoading} onClick={onConfirm} variant="destructive">
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
    <Dialog onOpenChange={onOpenChange} open={open}>
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
              max={order.totalAmount}
              min="0.01"
              onChange={(e) => setRequestedAmount(e.target.value)}
              placeholder={`Max: $${order.totalAmount.toFixed(2)}`}
              step="0.01"
              type="number"
              value={requestedAmount}
            />
            <p className="text-muted-foreground text-xs">Order total: ${order.totalAmount.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason for Refund *</Label>
            <Select onValueChange={(v) => setReason(parseInt(v) as RefundReason)} value={reason.toString()}>
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
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Please provide any additional details about your refund request..."
              rows={3}
              value={customerNotes}
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 text-sm dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
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
          <Button disabled={isLoading} onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isLoading || !reason} onClick={handleSubmit}>
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
      <div className="mb-4 rounded-full bg-muted p-6">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="mb-2 font-bold text-2xl">No orders yet</h2>
      <p className="mb-6 max-w-sm text-muted-foreground">
        When you place an order, it will appear here. Start shopping to see your orders!
      </p>
      <Button asChild>
        <Link to="/#products">Browse Products</Link>
      </Button>
    </div>
  );
}

function OrdersPage() {
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
        <h1 className="font-bold text-3xl">My Orders</h1>
        <p className="text-muted-foreground">Track and manage all your orders</p>
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-6 grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All{" "}
              <Badge className="ml-2" variant="secondary">
                {orderCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active{" "}
              <Badge className="ml-2" variant="secondary">
                {orderCounts.active}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed{" "}
              <Badge className="ml-2" variant="secondary">
                {orderCounts.completed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled{" "}
              <Badge className="ml-2" variant="secondary">
                {orderCounts.cancelled}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No {activeTab === "all" ? "" : activeTab} orders found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredOrders.map((order) => (
                  <OrderCard
                    isPaying={isPaying === order.id}
                    key={order.id}
                    onCancel={() => handleCancelClick(order)}
                    onPay={() => handlePayOrder(order)}
                    onViewDetails={() => handleViewDetails(order)}
                    order={order}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <OrderDetailsDialog
        isLoading={isLoadingDetails}
        isLoadingRefund={isLoadingRefund}
        onOpenChange={setDetailsOpen}
        onRequestRefund={handleRequestRefund}
        open={detailsOpen}
        order={selectedOrderDetails}
        refund={selectedOrderRefund}
      />

      <CancelConfirmDialog
        isLoading={isCancelling}
        onConfirm={handleCancelConfirm}
        onOpenChange={setCancelOpen}
        open={cancelOpen}
        order={selectedOrder}
      />

      <RefundRequestDialog
        isLoading={isRequestingRefund}
        onConfirm={handleRefundSubmit}
        onOpenChange={setRefundOpen}
        open={refundOpen}
        order={selectedOrderDetails}
      />
    </div>
  );
}

export const Route = createFileRoute("/(platform)/orders/")({
  component: OrdersPage,
});
