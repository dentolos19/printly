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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServer } from "@/lib/providers/server";
import {
  OrderResponse,
  OrderSummaryResponse,
  OrderStatus,
  OrderStatusColors,
  OrderStatusLabels,
} from "@/lib/server/order";
import { ProductSizeLabels } from "@/lib/server/product";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Package,
  Paintbrush,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function OrdersTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={OrderStatusColors[status]}>{OrderStatusLabels[status]}</Badge>;
}

// Valid status transitions
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PendingPayment]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Processing, OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Processing]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
  // Refund statuses - typically managed by refund flow, not direct updates
  [OrderStatus.RefundRequested]: [OrderStatus.Paid, OrderStatus.Cancelled], // Can be restored if refund rejected
  [OrderStatus.RefundApproved]: [], // Cannot be changed directly
  [OrderStatus.Refunded]: [], // Final state
};

function UpdateStatusDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  order: OrderSummaryResponse | null;
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
            <StatusBadge status={order.status} />
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
  if (!order && !isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {isLoading ? (
          <>
            <DialogHeader>
              <DialogTitle>Loading...</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-8">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </>
        ) : order ? (
          <>
            <DialogHeader>
              <DialogTitle>Order #{order.id.slice(0, 8)}</DialogTitle>
              <DialogDescription>Created: {new Date(order.createdAt).toLocaleString()}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">User ID</Label>
                  <p className="mt-1 font-mono text-sm">{order.userId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Amount</Label>
                  <p className="mt-1 text-lg font-bold">${order.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p className="mt-1 text-sm">{new Date(order.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Order Items ({order.items.length})</Label>
                <div className="mt-2 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                            <Package className="text-muted-foreground h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {item.productName ||
                                `${ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]}, ${item.color}`}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {ProductSizeLabels[item.size as keyof typeof ProductSizeLabels]} • {item.color}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${item.subtotal.toFixed(2)}</p>
                          <p className="text-muted-foreground text-sm">
                            {item.quantity} × ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {/* Imprint Info */}
                      {item.imprintId && (
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5">
                          <Paintbrush className="h-3.5 w-3.5 text-blue-600" />
                          <span className="flex-1 text-sm text-blue-700">
                            Custom: {item.imprintName || "Unnamed"}
                            {item.customizationPrice > 0 && (
                              <span className="ml-1 text-blue-600">(+${item.customizationPrice.toFixed(2)})</span>
                            )}
                          </span>
                          <Link
                            href={`/imprinter/${item.imprintId}`}
                            target="_blank"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="default" asChild className="w-full sm:w-auto">
                <Link href={`/admin/orders/${order.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Link>
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
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

export default function AdminOrdersPage() {
  const server = useServer();
  const [orders, setOrders] = useState<OrderSummaryResponse[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("0");

  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<OrderSummaryResponse | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await server.api.order.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders", {
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [server]);

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = orders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) => order.id.toLowerCase().includes(query) || order.userId.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === Number(statusFilter));
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter]);

  const handleViewDetails = async (order: OrderSummaryResponse) => {
    setSelectedOrder(order);
    setIsLoadingDetails(true);
    setDetailsOpen(true);

    try {
      const details = await server.api.order.getOrder(order.id);
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

  const handleUpdateStatus = (order: OrderSummaryResponse) => {
    setSelectedOrder(order);
    setStatusOpen(true);
  };

  const handleDeleteClick = (order: OrderSummaryResponse) => {
    setSelectedOrder(order);
    setDeleteOpen(true);
  };

  const handleStatusConfirm = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      await server.api.order.updateOrderStatus(selectedOrder.id, { status: newStatus });
      toast.success("Status updated", {
        description: `Order #${selectedOrder.id.slice(0, 8)} is now ${OrderStatusLabels[newStatus]}.`,
      });
      setStatusOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickStatusUpdate = async (order: OrderSummaryResponse, newStatus: OrderStatus) => {
    try {
      await server.api.order.updateOrderStatus(order.id, { status: newStatus });
      toast.success("Status updated", {
        description: `Order #${order.id.slice(0, 8)} is now ${OrderStatusLabels[newStatus]}.`,
      });
      fetchOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedOrder) return;

    setIsDeleting(true);
    try {
      await server.api.order.deleteOrder(selectedOrder.id);
      toast.success("Order deleted", {
        description: `Order #${selectedOrder.id.slice(0, 8)} has been deleted.`,
      });
      setDeleteOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Failed to delete order:", error);
      toast.error("Failed to delete order", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search by order ID or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="0">Pending Payment</SelectItem>
                {Object.entries(OrderStatusLabels)
                  .filter(([value]) => value !== "0")
                  .map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <OrdersTableSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-sm">{order.userId.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell className="text-right font-medium">${order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(order)}
                            disabled={validTransitions[order.status].length === 0}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Update Status
                          </DropdownMenuItem>
                          {/* Quick Ship - only show for Paid or Processing orders */}
                          {(order.status === OrderStatus.Paid || order.status === OrderStatus.Processing) && (
                            <DropdownMenuItem onClick={() => handleQuickStatusUpdate(order, OrderStatus.Shipped)}>
                              <Truck className="mr-2 h-4 w-4" />
                              Mark as Shipped
                            </DropdownMenuItem>
                          )}
                          {/* Quick Deliver - only show for Shipped orders */}
                          {order.status === OrderStatus.Shipped && (
                            <DropdownMenuItem onClick={() => handleQuickStatusUpdate(order, OrderStatus.Delivered)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Delivered
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(order)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OrderDetailsDialog
        order={selectedOrderDetails}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isLoading={isLoadingDetails}
      />

      <UpdateStatusDialog
        order={selectedOrder}
        open={statusOpen}
        onOpenChange={setStatusOpen}
        onConfirm={handleStatusConfirm}
        isLoading={isUpdating}
      />

      <DeleteConfirmDialog
        order={selectedOrder}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
