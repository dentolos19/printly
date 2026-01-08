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
import type { ProductResponse, ProductVariantResponse } from "@/lib/server/product";
import { ProductSize, ProductColor, ProductSizeLabels, ProductColorLabels } from "@/lib/server/product";
import { ArrowLeft, Edit, Package, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { api } = useServer();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createVariantOpen, setCreateVariantOpen] = useState(false);
  const [editVariantOpen, setEditVariantOpen] = useState(false);
  const [deleteVariantOpen, setDeleteVariantOpen] = useState(false);
  const [editInventoryOpen, setEditInventoryOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantResponse | null>(null);

  // Form states
  const [formSize, setFormSize] = useState<string>("");
  const [formColor, setFormColor] = useState<string>("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formReorderLevel, setFormReorderLevel] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.product.getProduct(productId);
      setProduct(data);
    } catch (error) {
      toast.error("Failed to load product");
      console.error(error);
      router.push("/admin/products");
    } finally {
      setLoading(false);
    }
  }, [api.product, productId, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const resetVariantForm = () => {
    setFormSize("");
    setFormColor("");
  };

  const resetInventoryForm = () => {
    setFormQuantity("");
    setFormReorderLevel("");
  };

  const handleCreateVariant = async () => {
    if (!formSize || !formColor) {
      toast.error("Please select size and color");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.variant.createVariant({
        productId,
        size: parseInt(formSize) as ProductSize,
        color: parseInt(formColor) as ProductColor,
      });
      toast.success("Variant created successfully");
      setCreateVariantOpen(false);
      resetVariantForm();
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create variant");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditVariant = async () => {
    if (!selectedVariant || !formSize || !formColor) {
      toast.error("Please select size and color");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.variant.updateVariant(selectedVariant.id, {
        size: parseInt(formSize) as ProductSize,
        color: parseInt(formColor) as ProductColor,
      });
      toast.success("Variant updated successfully");
      setEditVariantOpen(false);
      setSelectedVariant(null);
      resetVariantForm();
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update variant");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (!selectedVariant) return;

    setFormSubmitting(true);
    try {
      await api.variant.deleteVariant(selectedVariant.id);
      toast.success("Variant deleted successfully");
      setDeleteVariantOpen(false);
      setSelectedVariant(null);
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete variant");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateInventory = async () => {
    if (!selectedVariant) return;

    const quantity = formQuantity ? parseInt(formQuantity) : undefined;
    const reorderLevel = formReorderLevel ? parseInt(formReorderLevel) : undefined;

    if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (reorderLevel !== undefined && (isNaN(reorderLevel) || reorderLevel < 0)) {
      toast.error("Please enter a valid reorder level");
      return;
    }

    setFormSubmitting(true);
    try {
      if (selectedVariant.inventory) {
        await api.inventory.updateInventoryByVariant(selectedVariant.id, {
          quantity,
          reorderLevel,
        });
      } else {
        await api.inventory.createInventory({
          variantId: selectedVariant.id,
          quantity: quantity ?? 0,
          reorderLevel: reorderLevel ?? 10,
        });
      }
      toast.success("Inventory updated successfully");
      setEditInventoryOpen(false);
      setSelectedVariant(null);
      resetInventoryForm();
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update inventory");
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditVariant = (variant: ProductVariantResponse) => {
    setSelectedVariant(variant);
    setFormSize(variant.size.toString());
    setFormColor(variant.color.toString());
    setEditVariantOpen(true);
  };

  const openDeleteVariant = (variant: ProductVariantResponse) => {
    setSelectedVariant(variant);
    setDeleteVariantOpen(true);
  };

  const openEditInventory = (variant: ProductVariantResponse) => {
    setSelectedVariant(variant);
    setFormQuantity(variant.inventory?.quantity.toString() ?? "0");
    setFormReorderLevel(variant.inventory?.reorderLevel.toString() ?? "10");
    setEditInventoryOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Product not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const totalStock = product.variants.reduce((sum, v) => sum + (v.inventory?.quantity ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <Badge variant={product.isActive ? "default" : "secondary"}>
              {product.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Product details and variants</p>
        </div>
      </div>

      {/* Product Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Base Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${product.basePrice.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.variants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{new Date(product.createdAt).toLocaleDateString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Variants Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Manage product size and color variations</CardDescription>
          </div>
          <Button onClick={() => setCreateVariantOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Variant
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    <Package className="mx-auto mb-2 size-8 opacity-50" />
                    No variants yet. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                product.variants.map((variant) => {
                  const stock = variant.inventory?.quantity ?? 0;
                  const reorderLevel = variant.inventory?.reorderLevel ?? 0;
                  const isLowStock = stock <= reorderLevel && stock > 0;
                  const isOutOfStock = stock === 0;

                  return (
                    <TableRow key={variant.id}>
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
                      <TableCell>{stock}</TableCell>
                      <TableCell>{reorderLevel}</TableCell>
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
                            onClick={() => openEditInventory(variant)}
                            title="Edit Inventory"
                          >
                            <Package className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditVariant(variant)}
                            title="Edit Variant"
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteVariant(variant)}
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
        </CardContent>
      </Card>

      {/* Create Variant Dialog */}
      <Dialog open={createVariantOpen} onOpenChange={setCreateVariantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant</DialogTitle>
            <DialogDescription>Create a new size/color variant for this product</DialogDescription>
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
            <Button variant="outline" onClick={() => setCreateVariantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVariant} disabled={formSubmitting}>
              {formSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variant Dialog */}
      <Dialog open={editVariantOpen} onOpenChange={setEditVariantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
            <DialogDescription>Update variant size and color</DialogDescription>
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
            <Button variant="outline" onClick={() => setEditVariantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVariant} disabled={formSubmitting}>
              {formSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Variant Dialog */}
      <AlertDialog open={deleteVariantOpen} onOpenChange={setDeleteVariantOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant? This will also delete the associated inventory. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVariant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {formSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Inventory Dialog */}
      <Dialog open={editInventoryOpen} onOpenChange={setEditInventoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Inventory</DialogTitle>
            <DialogDescription>Update stock quantity and reorder level for this variant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                placeholder="0"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input
                id="reorderLevel"
                type="number"
                min="0"
                placeholder="10"
                value={formReorderLevel}
                onChange={(e) => setFormReorderLevel(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">You&apos;ll be alerted when stock falls below this level</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInventoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateInventory} disabled={formSubmitting}>
              {formSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
