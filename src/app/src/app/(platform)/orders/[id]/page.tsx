"use client";

import { OrderProgressTracker } from "@/components/order-progress-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Imprint } from "@/lib/server/imprint";
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
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
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

function OrderItemCard({ item, imprint }: { item: OrderItemResponse; imprint: Imprint | null }) {
  const hasImprint = !!item.imprintId;
  const hasCustomization = item.customizationPrice > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image Placeholder */}
          <div className="bg-muted flex h-24 w-24 shrink-0 items-center justify-center rounded-lg">
            <Package className="text-muted-foreground h-10 w-10" />
          </div>

          <div className="flex-1 space-y-2">
            {/* Product Info */}
            <div>
              <h3 className="font-semibold">{item.productName}</h3>
              <p className="text-muted-foreground text-sm">
                {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]} • {item.color}
              </p>
            </div>

            {/* Imprint Info */}
            {hasImprint && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                <Paintbrush className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">
                      Custom Design: {item.imprintName || "Unnamed Design"}
                    </span>
                    {hasCustomization && (
                      <span className="text-sm text-blue-600">+${item.customizationPrice.toFixed(2)}</span>
                    )}
                  </div>
                  {imprint && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600" asChild>
                      <Link href={`/imprinter/${item.imprintId}`}>
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View Design
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Price Info */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-muted-foreground text-sm">
                <span>
                  {item.quantity} × ${item.unitPrice.toFixed(2)}
                </span>
                {hasCustomization && <span> + ${item.customizationPrice.toFixed(2)} customization</span>}
              </div>
              <span className="text-lg font-bold">${item.subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [imprints, setImprints] = useState<Record<string, Imprint>>({});
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

        // Load imprint details for items with imprints
        const imprintIds = orderData.items.filter((item) => item.imprintId).map((item) => item.imprintId!);

        if (imprintIds.length > 0) {
          const imprintPromises = imprintIds.map(async (id) => {
            try {
              return await api.imprint.getImprint(id);
            } catch {
              return null;
            }
          });
          const imprintResults = await Promise.all(imprintPromises);
          const imprintMap: Record<string, Imprint> = {};
          imprintResults.forEach((imprint) => {
            if (imprint) {
              imprintMap[imprint.id] = imprint;
            }
          });
          setImprints(imprintMap);
        }

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
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="text-muted-foreground mb-4 h-16 w-16" />
          <h2 className="mb-2 text-2xl font-bold">Order not found</h2>
          <p className="text-muted-foreground mb-6">
            The order you're looking for doesn't exist or you don't have permission to view it.
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

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground text-sm">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <Badge className={`${OrderStatusColors[order.status]} text-sm`}>{OrderStatusLabels[order.status]}</Badge>
      </div>

      {/* Order Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderProgressTracker status={order.status} />
        </CardContent>
      </Card>

      {/* Refund Status */}
      {refund && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg text-yellow-800">
                <RefreshCcw className="h-5 w-5" />
                Refund Request
              </CardTitle>
              <Badge className={RefundStatusColors[refund.status]}>{RefundStatusLabels[refund.status]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-yellow-700">
            <div className="flex justify-between">
              <span>Requested Amount:</span>
              <span className="font-medium">${refund.requestedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Reason:</span>
              <span className="font-medium">{RefundReasonLabels[refund.reason]}</span>
            </div>
            {refund.approvedAmount && (
              <div className="flex justify-between">
                <span>Approved Amount:</span>
                <span className="font-medium text-green-700">${refund.approvedAmount.toFixed(2)}</span>
              </div>
            )}
            {refund.adminNotes && (
              <div className="rounded-lg bg-yellow-100 p-2">
                <span className="text-sm font-medium">Admin Notes:</span>
                <p className="text-sm italic">{refund.adminNotes}</p>
              </div>
            )}
            {hasActiveRefund && refund.conversationId && (
              <Button variant="outline" size="sm" className="mt-2" asChild>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items ({order.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => (
            <OrderItemCard key={item.id} item={item} imprint={item.imprintId ? imprints[item.imprintId] : null} />
          ))}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)}</span>
          </div>
          {order.items.some((item) => item.customizationPrice > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customization Fees</span>
              <span>
                ${order.items.reduce((sum, item) => sum + item.customizationPrice * item.quantity, 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-green-600">Free</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${order.totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {canRequestRefund && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Need help with this order?</h3>
                <p className="text-muted-foreground text-sm">You can request a refund if something went wrong.</p>
              </div>
              <Button variant="outline" onClick={() => setRefundDialogOpen(true)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Request Refund
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund Dialog */}
      <RefundRequestDialog
        order={order}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        onSubmit={handleRequestRefund}
        isLoading={isSubmittingRefund}
      />
    </div>
  );
}
