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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import { OrderStatusLabels } from "@/lib/server/order";
import {
  RefundReason,
  RefundReasonLabels,
  RefundStatus,
  RefundStatusColors,
  RefundStatusLabels,
  RefundWithOrderResponse,
} from "@/lib/server/refund";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  RefreshCcw,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function RefundsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RefundDetailsDialog({
  refund,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onProcess,
  isProcessing,
}: {
  refund: RefundWithOrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (approvedAmount?: number, adminNotes?: string) => void;
  onReject: (adminNotes?: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
}) {
  const [approvedAmount, setApprovedAmount] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (open && refund) {
      setApprovedAmount(refund.requestedAmount.toFixed(2));
      setAdminNotes(refund.adminNotes || "");
      setShowApproveForm(false);
      setShowRejectForm(false);
    }
  }, [open, refund]);

  if (!refund) return null;

  const canApproveReject = [RefundStatus.Requested, RefundStatus.UnderReview].includes(refund.status);
  const canProcess = refund.status === RefundStatus.Approved;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <RefreshCcw className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <DialogTitle>Refund Request #{refund.id.slice(0, 8)}</DialogTitle>
              <DialogDescription>
                Order #{refund.orderId.slice(0, 8)} • {refund.requestedByUserName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Status</span>
            <Badge className={RefundStatusColors[refund.status]}>{RefundStatusLabels[refund.status]}</Badge>
          </div>

          <Separator />

          {/* Refund Details */}
          <div className="space-y-3">
            <h4 className="font-medium">Refund Details</h4>
            <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested Amount</span>
                <span className="font-medium">${refund.requestedAmount.toFixed(2)}</span>
              </div>
              {refund.approvedAmount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved Amount</span>
                  <span className="font-medium text-green-600">${refund.approvedAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Total</span>
                <span>${refund.orderTotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason</span>
                <span>{RefundReasonLabels[refund.reason]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested At</span>
                <span>
                  {new Date(refund.requestedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {refund.processedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed At</span>
                  <span>
                    {new Date(refund.processedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {refund.stripeRefundId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stripe Refund ID</span>
                  <span className="font-mono text-xs">{refund.stripeRefundId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Conversation Link */}
          {refund.conversationId && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-medium">Support Chat Linked</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/support?conversation=${refund.conversationId}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Chat
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Customer Notes */}
          {refund.customerNotes && (
            <div className="space-y-2">
              <h4 className="font-medium">Customer Notes</h4>
              <div className="rounded-lg border bg-gray-50 p-3 text-sm">{refund.customerNotes}</div>
            </div>
          )}

          {/* Admin Notes */}
          {refund.adminNotes && !showApproveForm && !showRejectForm && (
            <div className="space-y-2">
              <h4 className="font-medium">Admin Notes</h4>
              <div className="rounded-lg border bg-blue-50 p-3 text-sm text-blue-700">{refund.adminNotes}</div>
            </div>
          )}

          {/* Approve Form */}
          {showApproveForm && (
            <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <h4 className="font-medium text-green-800">Approve Refund</h4>
              <div className="space-y-2">
                <Label htmlFor="approved-amount" className="text-green-700">
                  Approved Amount ($)
                </Label>
                <Input
                  id="approved-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={refund.orderTotalAmount}
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="border-green-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-notes-approve" className="text-green-700">
                  Admin Notes (Optional)
                </Label>
                <Textarea
                  id="admin-notes-approve"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this approval..."
                  rows={2}
                  className="border-green-300"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowApproveForm(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => onApprove(parseFloat(approvedAmount), adminNotes || undefined)}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? "Approving..." : "Confirm Approval"}
                </Button>
              </div>
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <h4 className="font-medium text-red-800">Reject Refund</h4>
              <div className="space-y-2">
                <Label htmlFor="admin-notes-reject" className="text-red-700">
                  Reason for Rejection
                </Label>
                <Textarea
                  id="admin-notes-reject"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why this refund is being rejected..."
                  rows={2}
                  className="border-red-300"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onReject(adminNotes || undefined)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {canApproveReject && !showApproveForm && !showRejectForm && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() => setShowApproveForm(true)}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          {canProcess && (
            <Button onClick={onProcess} disabled={isProcessing}>
              <CreditCard className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : "Process Refund via Stripe"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRefundsPage() {
  const server = useServer();
  const [refunds, setRefunds] = useState<RefundWithOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundWithOrderResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const fetchRefunds = async () => {
    try {
      const data = await server.api.refund.getAllRefunds();
      setRefunds(data);
    } catch (error) {
      console.error("Failed to fetch refunds:", error);
      toast.error("Failed to load refunds", {
        description: "Please try refreshing the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [server]);

  const filteredRefunds = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return refunds.filter((r) => [RefundStatus.Requested, RefundStatus.UnderReview].includes(r.status));
      case "approved":
        return refunds.filter((r) => [RefundStatus.Approved, RefundStatus.Processing].includes(r.status));
      case "completed":
        return refunds.filter((r) => r.status === RefundStatus.Completed);
      case "rejected":
        return refunds.filter((r) => [RefundStatus.Rejected, RefundStatus.Failed].includes(r.status));
      default:
        return refunds;
    }
  }, [refunds, activeTab]);

  const refundCounts = useMemo(
    () => ({
      all: refunds.length,
      pending: refunds.filter((r) => [RefundStatus.Requested, RefundStatus.UnderReview].includes(r.status)).length,
      approved: refunds.filter((r) => [RefundStatus.Approved, RefundStatus.Processing].includes(r.status)).length,
      completed: refunds.filter((r) => r.status === RefundStatus.Completed).length,
      rejected: refunds.filter((r) => [RefundStatus.Rejected, RefundStatus.Failed].includes(r.status)).length,
    }),
    [refunds],
  );

  const handleViewDetails = (refund: RefundWithOrderResponse) => {
    setSelectedRefund(refund);
    setDetailsOpen(true);
  };

  const handleApprove = async (approvedAmount?: number, adminNotes?: string) => {
    if (!selectedRefund) return;

    setIsProcessing(true);
    try {
      await server.api.refund.approveRefund(selectedRefund.id, {
        approvedAmount,
        adminNotes,
      });
      toast.success("Refund approved", {
        description: "The refund has been approved and is ready for processing.",
      });
      setDetailsOpen(false);
      fetchRefunds();
    } catch (error) {
      console.error("Failed to approve refund:", error);
      toast.error("Failed to approve refund", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (adminNotes?: string) => {
    if (!selectedRefund) return;

    setIsProcessing(true);
    try {
      await server.api.refund.rejectRefund(selectedRefund.id, { adminNotes });
      toast.success("Refund rejected", {
        description: "The refund request has been rejected.",
      });
      setDetailsOpen(false);
      fetchRefunds();
    } catch (error) {
      console.error("Failed to reject refund:", error);
      toast.error("Failed to reject refund", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedRefund) return;

    setIsProcessing(true);
    try {
      await server.api.refund.processRefund(selectedRefund.id);
      toast.success("Refund processed", {
        description: "The refund has been processed through Stripe.",
      });
      setDetailsOpen(false);
      fetchRefunds();
    } catch (error) {
      console.error("Failed to process refund:", error);
      toast.error("Failed to process refund", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickApprove = async (refund: RefundWithOrderResponse) => {
    setIsProcessing(true);
    try {
      await server.api.refund.approveRefund(refund.id, {});
      toast.success("Refund approved");
      fetchRefunds();
    } catch (error) {
      toast.error("Failed to approve refund");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickReject = async (refund: RefundWithOrderResponse) => {
    setIsProcessing(true);
    try {
      await server.api.refund.rejectRefund(refund.id, {});
      toast.success("Refund rejected");
      fetchRefunds();
    } catch (error) {
      toast.error("Failed to reject refund");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Refund Management</h1>
        <p className="text-muted-foreground">Review and process customer refund requests</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundCounts.pending}</div>
            <p className="text-muted-foreground text-xs">Awaiting decision</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Process</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundCounts.approved}</div>
            <p className="text-muted-foreground text-xs">Approved, pending Stripe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundCounts.completed}</div>
            <p className="text-muted-foreground text-xs">Successfully refunded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundCounts.rejected}</div>
            <p className="text-muted-foreground text-xs">Denied requests</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <RefundsSkeleton />
      ) : refunds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCcw className="text-muted-foreground mb-4 h-12 w-12" />
            <h2 className="mb-2 text-xl font-semibold">No refund requests</h2>
            <p className="text-muted-foreground">Refund requests from customers will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All{" "}
              <Badge variant="secondary" className="ml-2">
                {refundCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending{" "}
              <Badge variant="secondary" className="ml-2">
                {refundCounts.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved{" "}
              <Badge variant="secondary" className="ml-2">
                {refundCounts.approved}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed{" "}
              <Badge variant="secondary" className="ml-2">
                {refundCounts.completed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected{" "}
              <Badge variant="secondary" className="ml-2">
                {refundCounts.rejected}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Refund ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRefunds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center">
                        <p className="text-muted-foreground">No refunds in this category</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRefunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell className="font-mono text-sm">#{refund.id.slice(0, 8)}</TableCell>
                        <TableCell>{refund.requestedByUserName}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm">#{refund.orderId.slice(0, 8)}</span>
                            <p className="text-muted-foreground text-xs">
                              {refund.orderItemCount} items • ${refund.orderTotalAmount.toFixed(2)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{RefundReasonLabels[refund.reason]}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">${refund.requestedAmount.toFixed(2)}</span>
                            {refund.approvedAmount && refund.approvedAmount !== refund.requestedAmount && (
                              <p className="text-xs text-green-600">Approved: ${refund.approvedAmount.toFixed(2)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={RefundStatusColors[refund.status]}>
                            {RefundStatusLabels[refund.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(refund.requestedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(refund)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {[RefundStatus.Requested, RefundStatus.UnderReview].includes(refund.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleQuickApprove(refund)}
                                    className="text-green-600"
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Quick Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickReject(refund)} className="text-red-600">
                                    <X className="mr-2 h-4 w-4" />
                                    Quick Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {refund.status === RefundStatus.Approved && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedRefund(refund);
                                      handleProcess();
                                    }}
                                  >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Process Refund
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <RefundDetailsDialog
        refund={selectedRefund}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        onProcess={handleProcess}
        isProcessing={isProcessing}
      />
    </div>
  );
}
