"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServer } from "@/lib/providers/server";
import type { InventoryWithVariantResponse, LowStockAlertResponse, TotalStockResponse } from "@/lib/server/inventory";
import { ProductSizeLabels } from "@/lib/server/product";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type SortField = "productName" | "quantity" | "reorderLevel";
type SortOrder = "asc" | "desc";
type StockFilter = "all" | "low" | "out";

export default function InventoryPage() {
  const { api } = useServer();

  const [inventory, setInventory] = useState<InventoryWithVariantResponse[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertResponse[]>([]);
  const [totalStockData, setTotalStockData] = useState<TotalStockResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortField, setSortField] = useState<SortField>("productName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Dialog states
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryWithVariantResponse | null>(null);

  // Form states
  const [adjustAmount, setAdjustAmount] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formReorderLevel, setFormReorderLevel] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [allInventory, lowStock, totalData] = await Promise.all([
        api.inventory.getAllInventory(),
        api.inventory.getLowStockItems(),
        api.inventory.getTotalStock(),
      ]);
      setInventory(allInventory);
      setLowStockAlerts(lowStock);
      setTotalStockData(totalData);
    } catch (error) {
      toast.error("Failed to load inventory data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api.inventory]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Filter and sort inventory
  const filteredInventory = inventory
    .filter((item) => {
      // Search filter
      const matchesSearch = !searchQuery || item.productName.toLowerCase().includes(searchQuery.toLowerCase());

      // Stock filter
      let matchesStockFilter = true;
      if (stockFilter === "low") {
        matchesStockFilter = item.quantity <= item.reorderLevel && item.quantity > 0;
      } else if (stockFilter === "out") {
        matchesStockFilter = item.quantity === 0;
      }

      return matchesSearch && matchesStockFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "productName":
          comparison = a.productName.localeCompare(b.productName);
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "reorderLevel":
          comparison = a.reorderLevel - b.reorderLevel;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 size-4" />;
    return sortOrder === "asc" ? <ChevronUp className="ml-2 size-4" /> : <ChevronDown className="ml-2 size-4" />;
  };

  const openAdjustDialog = (item: InventoryWithVariantResponse) => {
    setSelectedInventory(item);
    setAdjustAmount("");
    setAdjustDialogOpen(true);
  };

  const openEditDialog = (item: InventoryWithVariantResponse) => {
    setSelectedInventory(item);
    setFormQuantity(item.quantity.toString());
    setFormReorderLevel(item.reorderLevel.toString());
    setEditDialogOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedInventory) return;

    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error("Please enter a valid adjustment amount");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.inventory.adjustInventory(selectedInventory.variantId, {
        adjustment: amount,
      });
      toast.success(`Stock ${amount > 0 ? "increased" : "decreased"} by ${Math.abs(amount)}`);
      setAdjustDialogOpen(false);
      setSelectedInventory(null);
      loadInventory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to adjust inventory");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedInventory) return;

    const quantity = parseInt(formQuantity);
    const reorderLevel = parseInt(formReorderLevel);

    if (isNaN(quantity) || quantity < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (isNaN(reorderLevel) || reorderLevel < 0) {
      toast.error("Please enter a valid reorder level");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.inventory.updateInventory(selectedInventory.id, {
        quantity,
        reorderLevel,
      });
      toast.success("Inventory updated successfully");
      setEditDialogOpen(false);
      setSelectedInventory(null);
      loadInventory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update inventory");
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalStock = totalStockData?.totalStock ?? 0;
  const outOfStockCount = totalStockData?.outOfStockCount ?? 0;
  const lowStockCount = lowStockAlerts.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Monitor and manage stock levels</p>
        </div>
        <Button variant="outline" onClick={loadInventory}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
            <p className="text-muted-foreground text-xs">units across all variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-muted-foreground text-xs">product variations</p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-yellow-500" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-muted-foreground text-xs">items need restocking</p>
          </CardContent>
        </Card>
        <Card className={outOfStockCount > 0 ? "border-red-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <XCircle className="size-4 text-red-500" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockCount}</div>
            <p className="text-muted-foreground text-xs">items unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
          <CardDescription>View and manage stock for all product variants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as StockFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("productName")} className="-ml-4">
                      Product
                      {getSortIcon("productName")}
                    </Button>
                  </TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("quantity")} className="-ml-4">
                      Quantity
                      {getSortIcon("quantity")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("reorderLevel")} className="-ml-4">
                      Reorder Level
                      {getSortIcon("reorderLevel")}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                      <Package className="mx-auto mb-2 size-8 opacity-50" />
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const isLowStock = item.quantity <= item.reorderLevel && item.quantity > 0;
                    const isOutOfStock = item.quantity === 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.color}</Badge>
                            {ProductSizeLabels[item.size]}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              isOutOfStock
                                ? "font-semibold text-red-600"
                                : isLowStock
                                  ? "font-semibold text-yellow-600"
                                  : ""
                            }
                          >
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{item.reorderLevel}</TableCell>
                        <TableCell>
                          {isOutOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLowStock ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => openAdjustDialog(item)}>
                              <Plus className="mr-1 size-3" />
                              <Minus className="size-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Inventory Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedInventory && (
                <>
                  Adjust stock for {selectedInventory.productName} ({ProductSizeLabels[selectedInventory.size]} /{" "}
                  {selectedInventory.color})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-muted-foreground text-center text-sm">
              Current stock: <strong>{selectedInventory?.quantity ?? 0}</strong>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustAmount">Adjustment Amount *</Label>
              <Input
                id="adjustAmount"
                type="number"
                placeholder="e.g., 10 or -5"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">Use positive numbers to add stock, negative to remove</p>
            </div>
            {adjustAmount && !isNaN(parseInt(adjustAmount)) && (
              <div className="bg-muted rounded-lg p-3 text-center">
                New stock will be:{" "}
                <strong>{Math.max(0, (selectedInventory?.quantity ?? 0) + parseInt(adjustAmount))}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={formSubmitting}>
              {formSubmitting ? "Adjusting..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Inventory Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory</DialogTitle>
            <DialogDescription>
              {selectedInventory && (
                <>
                  Update inventory for {selectedInventory.productName} ({ProductSizeLabels[selectedInventory.size]} /{" "}
                  {selectedInventory.color})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editQuantity">Quantity *</Label>
              <Input
                id="editQuantity"
                type="number"
                min="0"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editReorderLevel">Reorder Level *</Label>
              <Input
                id="editReorderLevel"
                type="number"
                min="0"
                value={formReorderLevel}
                onChange={(e) => setFormReorderLevel(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">You&apos;ll be alerted when stock falls below this level</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={formSubmitting}>
              {formSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
