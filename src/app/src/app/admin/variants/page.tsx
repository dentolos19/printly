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
import type { ProductResponse } from "@/lib/server/product";
import type { ProductVariantWithProductResponse } from "@/lib/server/variant";
import { ProductSize, ProductColor, ProductSizeLabels, ProductColorLabels } from "@/lib/server/product";
import { ArrowUpDown, ChevronDown, ChevronUp, Edit, ExternalLink, Package, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type SortField = "productName" | "size" | "color" | "stock";
type SortOrder = "asc" | "desc";

export default function VariantsPage() {
  const { api } = useServer();

  const [variants, setVariants] = useState<ProductVariantWithProductResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");
  const [filterColor, setFilterColor] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("productName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantWithProductResponse | null>(null);

  // Form states
  const [formProductId, setFormProductId] = useState("");
  const [formSize, setFormSize] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [variantsData, productsData] = await Promise.all([api.variant.getVariants(), api.product.getProducts()]);
      setVariants(variantsData);
      setProducts(productsData);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api.variant, api.product]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort variants
  const filteredVariants = variants
    .filter((variant) => {
      const matchesSearch = !searchQuery || variant.productName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProduct = filterProduct === "all" || variant.productId === filterProduct;

      const matchesSize = filterSize === "all" || variant.size === parseInt(filterSize);

      const matchesColor = filterColor === "all" || variant.color === parseInt(filterColor);

      return matchesSearch && matchesProduct && matchesSize && matchesColor;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "productName":
          comparison = a.productName.localeCompare(b.productName);
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "color":
          comparison = a.color - b.color;
          break;
        case "stock":
          comparison = (a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0);
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

  const resetForm = () => {
    setFormProductId("");
    setFormSize("");
    setFormColor("");
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (variant: ProductVariantWithProductResponse) => {
    setSelectedVariant(variant);
    setFormProductId(variant.productId);
    setFormSize(variant.size.toString());
    setFormColor(variant.color.toString());
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (variant: ProductVariantWithProductResponse) => {
    setSelectedVariant(variant);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formProductId || !formSize || !formColor) {
      toast.error("Please fill in all required fields");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.variant.createVariant({
        productId: formProductId,
        size: parseInt(formSize) as ProductSize,
        color: parseInt(formColor) as ProductColor,
      });
      toast.success("Variant created successfully");
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create variant");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedVariant || !formSize || !formColor) {
      toast.error("Please fill in all required fields");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.variant.updateVariant(selectedVariant.id, {
        size: parseInt(formSize) as ProductSize,
        color: parseInt(formColor) as ProductColor,
      });
      toast.success("Variant updated successfully");
      setEditDialogOpen(false);
      setSelectedVariant(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update variant");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVariant) return;

    setFormSubmitting(true);
    try {
      await api.variant.deleteVariant(selectedVariant.id);
      toast.success("Variant deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedVariant(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete variant");
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Get unique counts
  const uniqueSizes = new Set(variants.map((v) => v.size)).size;
  const uniqueColors = new Set(variants.map((v) => v.color)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Variants</h1>
          <p className="text-muted-foreground">Manage product size and color variations</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          Add Variant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{variants.length}</div>
            <p className="text-muted-foreground text-xs">across all products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sizes Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSizes}</div>
            <p className="text-muted-foreground text-xs">different sizes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Colors Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueColors}</div>
            <p className="text-muted-foreground text-xs">different colors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Variants</CardTitle>
          <CardDescription>View and manage all product variants</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
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
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSize} onValueChange={setFilterSize}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                {Object.entries(ProductSizeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterColor} onValueChange={setFilterColor}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colors</SelectItem>
                {Object.entries(ProductColorLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
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
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("size")} className="-ml-4">
                      Size
                      {getSortIcon("size")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("color")} className="-ml-4">
                      Color
                      {getSortIcon("color")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("stock")} className="-ml-4">
                      Stock
                      {getSortIcon("stock")}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                      <Package className="mx-auto mb-2 size-8 opacity-50" />
                      No variants found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVariants.map((variant) => {
                    const stock = variant.inventory?.quantity ?? 0;
                    const reorderLevel = variant.inventory?.reorderLevel ?? 0;
                    const isLowStock = stock <= reorderLevel && stock > 0;
                    const isOutOfStock = stock === 0;

                    return (
                      <TableRow key={variant.id}>
                        <TableCell>
                          <Link
                            href={`/admin/products/${variant.productId}`}
                            className="flex items-center gap-1 font-medium hover:underline"
                          >
                            {variant.productName}
                            <ExternalLink className="size-3" />
                          </Link>
                        </TableCell>
                        <TableCell>{ProductSizeLabels[variant.size]}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="size-4 rounded-full border"
                              style={{
                                backgroundColor:
                                  variant.color === ProductColor.Red
                                    ? "#ef4444"
                                    : variant.color === ProductColor.Blue
                                      ? "#3b82f6"
                                      : variant.color === ProductColor.Green
                                        ? "#22c55e"
                                        : "#171717",
                              }}
                            />
                            {ProductColorLabels[variant.color]}
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
                            {stock}
                          </span>
                        </TableCell>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(variant)}
                              title="Edit Variant"
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(variant)}
                              title="Delete Variant"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant</DialogTitle>
            <DialogDescription>Create a new product variant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={formProductId} onValueChange={setFormProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.isActive)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Size *</Label>
              <Select value={formSize} onValueChange={setFormSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ProductSizeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color *</Label>
              <Select value={formColor} onValueChange={setFormColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ProductColorLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={formSubmitting}>
              {formSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
            <DialogDescription>Update variant for {selectedVariant?.productName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Size *</Label>
              <Select value={formSize} onValueChange={setFormSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ProductSizeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color *</Label>
              <Select value={formColor} onValueChange={setFormColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ProductColorLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={formSubmitting}>
              {formSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant (
              {selectedVariant && (
                <>
                  {selectedVariant.productName} - {ProductSizeLabels[selectedVariant.size]} /{" "}
                  {ProductColorLabels[selectedVariant.color]}
                </>
              )}
              )? This will also delete the associated inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {formSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
