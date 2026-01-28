"use client";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  RefundResponse,
  RefundStatus,
  RefundStatusColors,
  RefundStatusLabels,
  RefundReasonLabels,
} from "@/lib/server/refund";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Mail,
  Package,
  Paintbrush,
  RefreshCcw,
  RotateCcw,
  Trash2,
  Truck,
  User,
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

// Valid status transitions
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PendingPayment]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Processing, OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Processing]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.RefundRequested]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.RefundApproved]: [],
  [OrderStatus.Refunded]: [],
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
          <p className="text-muted-foreground mt-1 font-mono text-xs">Variant: {item.variantId.slice(0, 8)}...</p>
        </div>

        {/* Imprint Badge & View Design CTA */}
        {hasImprint && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1">
              <Paintbrush className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{item.imprintName || "Custom Design"}</span>
            </div>
            <Button variant="default" size="sm" className="h-7 bg-blue-600 hover:bg-blue-700" asChild>
              <Link href={`/imprinter/${item.imprintId}`} target="_blank">
                View Design
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            <span className="text-muted-foreground font-mono text-xs">ID: {item.imprintId?.slice(0, 8)}...</span>
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

function UpdateStatusDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  order: OrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: OrderStatus) => void;
  isLoading: boolean;
}) {
  const [newStatus, setNewStatus] = useState<OrderStatus | null>(null);

  useEffect(() => {
    if (order) {
      setNewStatus(null);
    }
  }, [order]);

  if (!order) return null;

  const availableStatuses = validTransitions[order.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>Change the status for order #{order.id.slice(0, 8)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <Badge className={OrderStatusColors[order.status]}>{OrderStatusLabels[order.status]}</Badge>
          </div>

          <div className="space-y-2">
            <Label>New Status</Label>
            {availableStatuses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No status changes available for this order.</p>
            ) : (
              <Select
                value={newStatus !== null ? String(newStatus) : undefined}
                onValueChange={(value) => setNewStatus(Number(value) as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={String(status)}>
                      {OrderStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => newStatus !== null && onConfirm(newStatus)} disabled={isLoading || newStatus === null}>
            {isLoading ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  order: OrderResponse | null;
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
          <DialogTitle>Delete Order</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete order #{order.id.slice(0, 8)}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { api } = useServer();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [refund, setRefund] = useState<RefundResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
          description: "The order could not be found.",
        });
        router.push("/admin/orders");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId, api, router]);

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setIsUpdating(true);
    try {
      const updatedOrder = await api.order.updateOrder(order.id, { status: newStatus });
      setOrder(updatedOrder);
      setStatusDialogOpen(false);
      toast.success("Order status updated", {
        description: `Order is now ${OrderStatusLabels[newStatus]}.`,
      });
    } catch (error) {
      console.error("Failed to update order:", error);
      toast.error("Failed to update order status", {
        description: "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;

    setIsDeleting(true);
    try {
      await api.order.deleteOrder(order.id);
      toast.success("Order deleted", {
        description: `Order #${order.id.slice(0, 8)} has been deleted.`,
      });
      router.push("/admin/orders");
    } catch (error) {
      console.error("Failed to delete order:", error);
      toast.error("Failed to delete order", {
        description: "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
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
          <p className="text-muted-foreground mb-6">The order you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = StatusIcons[order.status];
  const availableTransitions = validTransitions[order.status];
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const customizationTotal = order.items.reduce((sum, item) => sum + item.customizationPrice * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/orders">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
                <Badge className={`${OrderStatusColors[order.status]} text-sm`}>{OrderStatusLabels[order.status]}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Created on{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {availableTransitions.length > 0 && (
              <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Update Status
              </Button>
            )}
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
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
                  <div className="grid gap-2 sm:grid-cols-2">
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
                  </div>
                  {refund.customerNotes && (
                    <div className="rounded-lg bg-yellow-100 p-2">
                      <span className="text-xs font-medium">Customer Notes:</span>
                      <p className="text-sm">{refund.customerNotes}</p>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                    <Link href="/admin/refunds">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage in Refunds
                    </Link>
                  </Button>
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
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Clock className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Updated</p>
                    <p className="font-medium">
                      {new Date(order.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <User className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">User ID</p>
                    <p className="font-mono text-sm">{order.userId.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Mail className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="text-sm">{order.userEmail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <UpdateStatusDialog
        order={order}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onConfirm={handleUpdateStatus}
        isLoading={isUpdating}
      />

      <DeleteConfirmDialog
        order={order}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
