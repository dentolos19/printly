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
import { ProductSize, ProductSizeLabels, CommonColors } from "@/lib/server/product";
import { ArrowLeft, Edit, ImageIcon, Package, Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantResponse | null>(null);

  // Form states
  const [formSize, setFormSize] = useState<string>("");
  const [formColor, setFormColor] = useState<string>("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formReorderLevel, setFormReorderLevel] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!formSize || !formColor.trim()) {
      toast.error("Please select size and enter color");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.variant.createVariant({
        productId,
        size: parseInt(formSize) as ProductSize,
        color: formColor.trim(),
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
    if (!selectedVariant || !formSize || !formColor.trim()) {
      toast.error("Please select size and enter color");
      return;
    }

    setFormSubmitting(true);
    try {
      await api.variant.updateVariant(selectedVariant.id, {
        size: parseInt(formSize) as ProductSize,
        color: formColor.trim(),
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
    setFormColor(variant.color);
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

  const openImageDialog = (variant: ProductVariantResponse) => {
    setSelectedVariant(variant);
    setSelectedImage(null);
    setImagePreview(null);
    setImageDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!selectedVariant || !selectedImage) {
      toast.error("Please select an image to upload");
      return;
    }

    setUploadingImage(true);
    try {
      await api.variant.uploadVariantImage(selectedVariant.id, selectedImage);
      toast.success("Image uploaded successfully");
      setImageDialogOpen(false);
      setSelectedVariant(null);
      setSelectedImage(null);
      setImagePreview(null);
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!selectedVariant) return;

    setUploadingImage(true);
    try {
      await api.variant.removeVariantImage(selectedVariant.id);
      toast.success("Image removed successfully");
      setImageDialogOpen(false);
      setSelectedVariant(null);
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove image");
    } finally {
      setUploadingImage(false);
    }
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
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
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
                      <TableCell>
                        {variant.imageUrl ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded-md border">
                            <Image
                              src={variant.imageUrl}
                              alt={`${product.name} - ${variant.color}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-md border">
                            <ImageIcon className="size-5" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{ProductSizeLabels[variant.size]}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{variant.color}</Badge>
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
                            onClick={() => openImageDialog(variant)}
                            title="Manage Image"
                          >
                            <ImageIcon className="size-4" />
                          </Button>
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
              <Input
                placeholder="Enter color (e.g., Red, Navy Blue, Forest Green)"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {CommonColors.slice(0, 8).map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setFormColor(color)}
                  >
                    {color}
                  </Button>
                ))}
              </div>
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
              <Input
                placeholder="Enter color (e.g., Red, Navy Blue, Forest Green)"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {CommonColors.slice(0, 8).map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setFormColor(color)}
                  >
                    {color}
                  </Button>
                ))}
              </div>
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

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Variant Image</DialogTitle>
            <DialogDescription>
              {selectedVariant
                ? `Manage image for ${ProductSizeLabels[selectedVariant.size]} - ${selectedVariant.color}`
                : "Manage variant image"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current Image */}
            {selectedVariant?.imageUrl && (
              <div className="space-y-2">
                <Label>Current Image</Label>
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                  <Image src={selectedVariant.imageUrl} alt="Current variant image" fill className="object-cover" />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? "Removing..." : "Remove Image"}
                </Button>
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && !selectedVariant?.imageUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="space-y-2">
              <Label>{selectedVariant?.imageUrl ? "Replace Image" : "Upload Image"}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <ImageIcon className="mr-2 size-4" />
                  Choose File
                </Button>
                {selectedImage && (
                  <Button onClick={handleImageUpload} disabled={uploadingImage}>
                    {uploadingImage ? "Uploading..." : "Upload"}
                  </Button>
                )}
              </div>
              {selectedImage && <p className="text-muted-foreground text-xs">Selected: {selectedImage.name}</p>}
              <p className="text-muted-foreground text-xs">Supported formats: JPEG, PNG, WebP, GIF. Max size: 10MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
