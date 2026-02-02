"use client";

import { OrderProgressTracker } from "@/components/order-progress-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import {
  OrderItemResponse,
  OrderResponse,
  OrderStatus,
  OrderStatusColors,
  OrderStatusLabels,
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
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  HelpCircle,
  MessageSquare,
  Package,
  Paintbrush,
  RefreshCcw,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function OrderItemCard({ item }: { item: OrderItemResponse }) {
  const hasImprint = !!item.imprintId;
  const hasCustomization = item.customizationPrice > 0;

  return (
    <div className="flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Product Image */}
      <div className="bg-muted relative h-32 w-32 shrink-0 overflow-hidden rounded-lg">
        {item.productImageUrl ? (
          <Image src={item.productImageUrl} alt={item.productName} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="text-muted-foreground h-12 w-12" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between">
        {/* Product Info */}
        <div>
          <h3 className="text-lg font-semibold">{item.productName}</h3>
          <p className="text-muted-foreground text-sm">
            {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]} • {item.color}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">Qty: {item.quantity}</p>
        </div>

        {/* Imprint Badge & View Design CTA */}
        {hasImprint && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1">
              <Paintbrush className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{item.imprintName || "Custom Design"}</span>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600" asChild>
              <Link href={`/imprinter/${item.imprintId}`}>
                View Design
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}

        {/* Price */}
        <div className="mt-2 flex items-end justify-between">
          <div className="text-muted-foreground text-sm">
            ${item.unitPrice.toFixed(2)} × {item.quantity}
            {hasCustomization && <span className="text-blue-600"> + ${item.customizationPrice.toFixed(2)} custom</span>}
          </div>
          <span className="text-xl font-bold">${item.subtotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function RefundRequestDialog({
  order,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  order: OrderResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { reason: RefundReason; description: string; amount: number }) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState<RefundReason | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(order.totalAmount);

  const availableReasons = getAvailableRefundReasons(order.status);

  const handleSubmit = () => {
    if (reason === null) return;
    onSubmit({ reason, description, amount });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>Submit a refund request for order #{order.id.slice(0, 8)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund</Label>
            <Select
              value={reason !== null ? String(reason) : undefined}
              onValueChange={(val) => setReason(Number(val) as RefundReason)}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {availableReasons.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {RefundReasonLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Refund Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={order.totalAmount}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">Maximum: ${order.totalAmount.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue or reason for your refund request..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || reason === null}>
            {isLoading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { api } = useServer();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [refund, setRefund] = useState<RefundResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;

      setLoading(true);
      try {
        const orderData = await api.order.getOrder(orderId);
        setOrder(orderData);

        // Load refund if exists
        try {
          const refundData = await api.refund.getRefundByOrder(orderId);
          setRefund(refundData);
        } catch {
          // No refund exists
        }
      } catch (error) {
        console.error("Failed to load order:", error);
        toast.error("Failed to load order", {
          description: "The order could not be found or you don't have permission to view it.",
        });
        router.push("/orders");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId, api, router]);

  const handleRequestRefund = async (data: { reason: RefundReason; description: string; amount: number }) => {
    if (!order) return;

    setIsSubmittingRefund(true);
    try {
      const newRefund = await api.refund.createRefundRequest({
        orderId: order.id,
        reason: data.reason,
        requestedAmount: data.amount,
        customerNotes: data.description,
      });
      setRefund(newRefund);
      setRefundDialogOpen(false);
      toast.success("Refund request submitted", {
        description: "We'll review your request and get back to you soon.",
      });
    } catch (error) {
      console.error("Failed to request refund:", error);
      toast.error("Failed to submit refund request", {
        description: "Please try again later.",
      });
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <Package className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
          <h2 className="mb-2 text-2xl font-bold">Order not found</h2>
          <p className="text-muted-foreground mb-6">
            The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Button asChild>
            <Link href="/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = StatusIcons[order.status];
  const canRequestRefund =
    [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered].includes(order.status) && !refund;
  const hasActiveRefund =
    refund &&
    [RefundStatus.Requested, RefundStatus.UnderReview, RefundStatus.Approved, RefundStatus.Processing].includes(
      refund.status,
    );

  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const customizationTotal = order.items.reduce((sum, item) => sum + item.customizationPrice * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/orders">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
                <Badge className={`${OrderStatusColors[order.status]} text-sm`}>
                  {OrderStatusLabels[order.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Placed on{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/support">
                <HelpCircle className="mr-2 h-4 w-4" />
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Order Progress */}
      <div className="border-b bg-white py-6">
        <div className="mx-auto max-w-7xl px-6">
          <OrderProgressTracker status={order.status} />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Order Items */}
          <div className="space-y-6 lg:col-span-2">
            {/* Refund Status */}
            {refund && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-yellow-800">
                      <RefreshCcw className="h-5 w-5" />
                      Refund Request
                    </CardTitle>
                    <Badge className={RefundStatusColors[refund.status]}>{RefundStatusLabels[refund.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-yellow-700">
                  <div className="flex justify-between text-sm">
                    <span>Requested Amount:</span>
                    <span className="font-medium">${refund.requestedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reason:</span>
                    <span className="font-medium">{RefundReasonLabels[refund.reason]}</span>
                  </div>
                  {refund.approvedAmount && (
                    <div className="flex justify-between text-sm">
                      <span>Approved Amount:</span>
                      <span className="font-medium text-green-700">${refund.approvedAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {hasActiveRefund && refund.conversationId && (
                    <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                      <Link href={`/messages?conversation=${refund.conversationId}`}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Continue in Chat
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Order Items ({order.items.length})</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <OrderItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Products Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {customizationTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customization Fees</span>
                    <span className="text-blue-600">${customizationTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">${order.totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Details */}
          <div className="space-y-6">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Package className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Order Number</p>
                    <p className="font-mono font-medium">#{order.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Calendar className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Order Date</p>
                    <p className="font-medium">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <StatusIcon className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <p className="font-medium">{OrderStatusLabels[order.status]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {canRequestRefund && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-2 font-medium">Need help?</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    If something went wrong with your order, you can request a refund.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setRefundDialogOpen(true)}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Request Refund
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Refund Dialog */}
      {order && (
        <RefundRequestDialog
          order={order}
          open={refundDialogOpen}
          onOpenChange={setRefundDialogOpen}
          onSubmit={handleRequestRefund}
          isLoading={isSubmittingRefund}
        />
      )}
    </div>
  );
}
