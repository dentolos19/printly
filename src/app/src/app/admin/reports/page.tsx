"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import {
  AdminReportResponse,
  ReportListQuery,
  ReportListResponse,
  ReportReason,
  ReportReasonLabels,
  ReportStatus,
  ReportStatusLabels,
  ReportType,
  ReportTypeLabels,
} from "@/lib/server/community";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, MoreHorizontalIcon, Trash2, XCircle, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const { api } = useServer();

  const [reports, setReports] = useState<AdminReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<ReportType | undefined>();

  const [selectedReport, setSelectedReport] = useState<AdminReportResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<ReportStatus | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const query: ReportListQuery = {
        page,
        pageSize: 20,
        status: statusFilter,
        type: typeFilter,
      };
      const data = await api.community.getAllReports(query);
      setReports(data.reports);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [api.community, page, statusFilter, typeFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleViewDetails = (report: AdminReportResponse) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

  const handleUpdateClick = (report: AdminReportResponse) => {
    setSelectedReport(report);
    setUpdateStatus(report.status);
    setAdminNotes(report.adminNotes || "");
    setUpdateOpen(true);
  };

  const handleUpdateReport = async () => {
    if (!selectedReport || updateStatus === null) return;

    setIsUpdating(true);
    try {
      await api.community.updateReportStatus(selectedReport.id, {
        status: updateStatus,
        adminNotes: adminNotes || undefined,
      });
      toast.success("Report updated successfully");
      setUpdateOpen(false);
      setAdminNotes("");
      loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update report");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedReport || selectedReport.reportType !== ReportType.Post || !selectedReport.postId) return;

    try {
      await api.community.deletePost(selectedReport.postId);
      toast.success("Post deleted successfully");
      setDetailsOpen(false);
      loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.Pending:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case ReportStatus.Reviewed:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case ReportStatus.Resolved:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case ReportStatus.Dismissed:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.Pending:
        return <AlertTriangle className="h-4 w-4" />;
      case ReportStatus.Reviewed:
        return <Eye className="h-4 w-4" />;
      case ReportStatus.Resolved:
        return <CheckCircle2 className="h-4 w-4" />;
      case ReportStatus.Dismissed:
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reported Content</h1>
        <p className="text-muted-foreground">Review and manage reported posts, comments, and users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Label className="text-xs font-semibold">Filter by Status</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === undefined ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(undefined);
                    setPage(1);
                  }}
                >
                  All
                </Button>
                {Object.entries(ReportStatusLabels).map(([status, label]) => (
                  <Button
                    key={status}
                    variant={statusFilter === Number(status) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setStatusFilter(Number(status) as ReportStatus);
                      setPage(1);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <Label className="text-xs font-semibold">Filter by Type</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant={typeFilter === undefined ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setTypeFilter(undefined);
                    setPage(1);
                  }}
                >
                  All
                </Button>
                {Object.entries(ReportTypeLabels).map(([type, label]) => (
                  <Button
                    key={type}
                    variant={typeFilter === Number(type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTypeFilter(Number(type) as ReportType);
                      setPage(1);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="text-muted-foreground/50 mx-auto h-12 w-12" />
            <p className="text-muted-foreground mt-4">No reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{report.reporterName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{report.reporterName}</p>
                      <p className="text-muted-foreground text-xs">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ReportTypeLabels[report.reportType]}</Badge>
                    <Badge className={getStatusColor(report.status)}>
                      {getStatusIcon(report.status)}
                      <span className="ml-1">{ReportStatusLabels[report.status]}</span>
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(report)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateClick(report)}>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Update Status
                        </DropdownMenuItem>
                        {report.reportType === ReportType.Post && (
                          <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Post
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Reason</p>
                  <p className="text-sm">{ReportReasonLabels[report.reason]}</p>
                </div>
                {report.description && (
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold">Description</p>
                    <p className="text-sm">{report.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <div className="flex items-center px-3 text-sm">
            Page {page} of {totalPages}
          </div>
          <Button variant="outline" disabled={page === totalPages || loading} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              {ReportTypeLabels[selectedReport?.reportType || ReportType.Post]} Report
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Report ID</p>
                  <p className="font-mono text-sm">{selectedReport.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Status</p>
                  <Badge className={cn("mt-1", getStatusColor(selectedReport.status))}>
                    {ReportStatusLabels[selectedReport.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Reported By</p>
                  <p className="text-sm">{selectedReport.reporterName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Reason</p>
                  <p className="text-sm">{ReportReasonLabels[selectedReport.reason]}</p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Description</p>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
              )}

              {selectedReport.adminNotes && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Admin Notes</p>
                  <p className="text-sm">{selectedReport.adminNotes}</p>
                </div>
              )}

              {selectedReport.reviewedAt && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold">Reviewed At</p>
                  <p className="text-sm">{new Date(selectedReport.reviewedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Report Status</DialogTitle>
            <DialogDescription>Change the status and add notes for this report</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ReportStatusLabels).map(([status, label]) => (
                  <Button
                    key={status}
                    variant={updateStatus === Number(status) ? "default" : "outline"}
                    onClick={() => setUpdateStatus(Number(status) as ReportStatus)}
                    size="sm"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this report..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>

            {selectedReport?.reportType === ReportType.Post && (
              <Button onClick={handleDeletePost} variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Post
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUpdateOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateReport} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
