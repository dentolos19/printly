"use client";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  RefundResponse,
  RefundStatus,
  RefundStatusColors,
  RefundStatusLabels,
  RefundReasonLabels,
} from "@/lib/server/refund";
import {
  ArrowLeft,
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

function OrderItemCard({ item, imprint }: { item: OrderItemResponse; imprint: Imprint | null }) {
  const hasImprint = !!item.imprintId;
  const hasCustomization = item.customizationPrice > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image Placeholder */}
          <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-lg">
            <Package className="text-muted-foreground h-8 w-8" />
          </div>

          <div className="flex-1 space-y-2">
            {/* Product Info */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{item.productName}</h3>
                <p className="text-muted-foreground text-sm">
                  {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]} • {item.color}
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-xs">Variant: {item.variantId.slice(0, 8)}...</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold">${item.subtotal.toFixed(2)}</span>
                <p className="text-muted-foreground text-sm">
                  {item.quantity} × ${item.unitPrice.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Imprint Info */}
            {hasImprint && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <Paintbrush className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-800">
                        Custom Design: {item.imprintName || "Unnamed Design"}
                      </span>
                      {hasCustomization && (
                        <span className="text-sm font-medium text-blue-600">
                          +${item.customizationPrice.toFixed(2)} per item
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1 font-mono text-xs">Imprint ID: {item.imprintId}</div>
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/imprinter/${item.imprintId}`} target="_blank">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View Design
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [imprints, setImprints] = useState<Record<string, Imprint>>({});
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
          <p className="text-muted-foreground mb-6">The order you're looking for doesn't exist.</p>
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

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground text-sm">
              Created on{" "}
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
        <div className="flex items-center gap-2">
          <Badge className={`${OrderStatusColors[order.status]} text-sm`}>{OrderStatusLabels[order.status]}</Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          {availableTransitions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Update Status
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Order
          </Button>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <User className="text-muted-foreground h-5 w-5" />
            <div>
              <Label className="text-muted-foreground text-xs">User ID</Label>
              <p className="font-mono text-sm">{order.userId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="text-muted-foreground h-5 w-5" />
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="text-sm">{order.userEmail}</p>
            </div>
          </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-yellow-600">Requested Amount</Label>
                <p className="font-medium">${refund.requestedAmount.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-yellow-600">Reason</Label>
                <p className="font-medium">{RefundReasonLabels[refund.reason]}</p>
              </div>
              {refund.approvedAmount && (
                <div>
                  <Label className="text-yellow-600">Approved Amount</Label>
                  <p className="font-medium text-green-700">${refund.approvedAmount.toFixed(2)}</p>
                </div>
              )}
            </div>
            {refund.customerNotes && (
              <div className="rounded-lg bg-yellow-100 p-2">
                <Label className="text-yellow-600">Customer Notes</Label>
                <p className="text-sm">{refund.customerNotes}</p>
              </div>
            )}
            {refund.adminNotes && (
              <div className="rounded-lg bg-yellow-100 p-2">
                <Label className="text-yellow-600">Admin Notes</Label>
                <p className="text-sm italic">{refund.adminNotes}</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/admin/refunds">
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage in Refunds
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items ({order.items.length})</CardTitle>
          <CardDescription>Products ordered by the customer</CardDescription>
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
            <span className="text-muted-foreground">Products Subtotal</span>
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

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{new Date(order.updatedAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

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
