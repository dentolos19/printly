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
import type { PrintAreaResponse } from "@/lib/server/print-area";
import type { ProductResponse, ProductVariantResponse } from "@/lib/server/product";
import { CommonColors, ProductSize, ProductSizeLabels } from "@/lib/server/product";
import { ArrowLeft, Box, Edit, ImageIcon, MapPin, Package, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ModelPreview = dynamic(() => import("./model-preview"), { ssr: false });

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

  // Product image/model dialog states
  const [productImageDialogOpen, setProductImageDialogOpen] = useState(false);
  const [productModelDialogOpen, setProductModelDialogOpen] = useState(false);
  const [selectedProductImage, setSelectedProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [selectedProductModel, setSelectedProductModel] = useState<File | null>(null);
  const [modelPreviewScreenshot, setModelPreviewScreenshot] = useState<File | null>(null);
  const [modelPreviewImageUrl, setModelPreviewImageUrl] = useState<string | null>(null);
  const [uploadingProductMedia, setUploadingProductMedia] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const productModelInputRef = useRef<HTMLInputElement>(null);

  // Print area states
  const [printAreas, setPrintAreas] = useState<PrintAreaResponse[]>([]);
  const [printAreasLoading, setPrintAreasLoading] = useState(false);
  const [printAreaDialogOpen, setPrintAreaDialogOpen] = useState(false);
  const [editPrintAreaDialogOpen, setEditPrintAreaDialogOpen] = useState(false);
  const [deletePrintAreaDialogOpen, setDeletePrintAreaDialogOpen] = useState(false);
  const [selectedPrintArea, setSelectedPrintArea] = useState<PrintAreaResponse | null>(null);
  const [printAreaFormData, setPrintAreaFormData] = useState({
    areaId: "",
    name: "",
    meshName: "",
    rayDirectionX: "0",
    rayDirectionY: "0",
    rayDirectionZ: "1",
  });
  const [printAreaSubmitting, setPrintAreaSubmitting] = useState(false);

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

  const loadPrintAreas = useCallback(async () => {
    setPrintAreasLoading(true);
    try {
      const areas = await api.printArea.getByProduct(productId);
      setPrintAreas(areas);
    } catch (error) {
      console.error("Failed to load print areas:", error);
    } finally {
      setPrintAreasLoading(false);
    }
  }, [api.printArea, productId]);

  useEffect(() => {
    loadProduct();
    loadPrintAreas();
  }, [loadProduct, loadPrintAreas]);

  const resetPrintAreaForm = () => {
    setPrintAreaFormData({
      areaId: "",
      name: "",
      meshName: "",
      rayDirectionX: "0",
      rayDirectionY: "0",
      rayDirectionZ: "1",
    });
  };

  const handleCreatePrintArea = async () => {
    if (!printAreaFormData.areaId.trim() || !printAreaFormData.name.trim()) {
      toast.error("Area ID and name are required");
      return;
    }

    setPrintAreaSubmitting(true);
    try {
      await api.printArea.createPrintArea({
        productId,
        areaId: printAreaFormData.areaId.trim(),
        name: printAreaFormData.name.trim(),
        meshName: printAreaFormData.meshName.trim() || undefined,
        rayDirection: [
          parseFloat(printAreaFormData.rayDirectionX) || 0,
          parseFloat(printAreaFormData.rayDirectionY) || 0,
          parseFloat(printAreaFormData.rayDirectionZ) || 1,
        ],
      });
      toast.success("Print area created");
      setPrintAreaDialogOpen(false);
      resetPrintAreaForm();
      loadPrintAreas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create print area");
    } finally {
      setPrintAreaSubmitting(false);
    }
  };

  const handleUpdatePrintArea = async () => {
    if (!selectedPrintArea) return;
    if (!printAreaFormData.areaId.trim() || !printAreaFormData.name.trim()) {
      toast.error("Area ID and name are required");
      return;
    }

    setPrintAreaSubmitting(true);
    try {
      await api.printArea.updatePrintArea(selectedPrintArea.id, {
        areaId: printAreaFormData.areaId.trim(),
        name: printAreaFormData.name.trim(),
        meshName: printAreaFormData.meshName.trim() || undefined,
        rayDirection: [
          parseFloat(printAreaFormData.rayDirectionX) || 0,
          parseFloat(printAreaFormData.rayDirectionY) || 0,
          parseFloat(printAreaFormData.rayDirectionZ) || 1,
        ],
      });
      toast.success("Print area updated");
      setEditPrintAreaDialogOpen(false);
      setSelectedPrintArea(null);
      resetPrintAreaForm();
      loadPrintAreas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update print area");
    } finally {
      setPrintAreaSubmitting(false);
    }
  };

  const handleDeletePrintArea = async () => {
    if (!selectedPrintArea) return;

    setPrintAreaSubmitting(true);
    try {
      await api.printArea.deletePrintArea(selectedPrintArea.id);
      toast.success("Print area deleted");
      setDeletePrintAreaDialogOpen(false);
      setSelectedPrintArea(null);
      loadPrintAreas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete print area");
    } finally {
      setPrintAreaSubmitting(false);
    }
  };

  const openEditPrintArea = (area: PrintAreaResponse) => {
    setSelectedPrintArea(area);
    setPrintAreaFormData({
      areaId: area.areaId,
      name: area.name,
      meshName: area.meshName || "",
      rayDirectionX: area.rayDirection[0].toString(),
      rayDirectionY: area.rayDirection[1].toString(),
      rayDirectionZ: area.rayDirection[2].toString(),
    });
    setEditPrintAreaDialogOpen(true);
  };

  const openDeletePrintArea = (area: PrintAreaResponse) => {
    setSelectedPrintArea(area);
    setDeletePrintAreaDialogOpen(true);
  };

  const addDefaultPrintAreas = async () => {
    setPrintAreaSubmitting(true);
    try {
      await api.printArea.bulkCreatePrintAreas({
        productId,
        printAreas: [
          { areaId: "front", name: "Front", rayDirection: [0, 0, 1], displayOrder: 0 },
          { areaId: "back", name: "Back", rayDirection: [0, 0, -1], displayOrder: 1 },
        ],
      });
      toast.success("Default print areas added");
      loadPrintAreas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add default print areas");
    } finally {
      setPrintAreaSubmitting(false);
    }
  };

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

  // Product image handlers
  const handleProductImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSelectedProductImage(file);
      setProductImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProductImageUpload = async () => {
    if (!selectedProductImage) {
      toast.error("Please select an image to upload");
      return;
    }

    setUploadingProductMedia(true);
    try {
      await api.product.uploadProductImage(productId, selectedProductImage);
      toast.success("Product image uploaded successfully");
      setProductImageDialogOpen(false);
      setSelectedProductImage(null);
      setProductImagePreview(null);
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload product image");
    } finally {
      setUploadingProductMedia(false);
    }
  };

  const handleRemoveProductImage = async () => {
    setUploadingProductMedia(true);
    try {
      await api.product.deleteProductImage(productId);
      toast.success("Product image removed successfully");
      setProductImageDialogOpen(false);
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove product image");
    } finally {
      setUploadingProductMedia(false);
    }
  };

  // Product model handlers
  const handleProductModelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".glb")) {
        toast.error("Invalid file type. Only .glb files are allowed.");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setSelectedProductModel(file);
      setModelPreviewScreenshot(null);
      if (modelPreviewImageUrl) {
        URL.revokeObjectURL(modelPreviewImageUrl);
        setModelPreviewImageUrl(null);
      }
    }
  };

  const handleProductModelUpload = async () => {
    if (!selectedProductModel) {
      toast.error("Please select a 3D model to upload");
      return;
    }

    setUploadingProductMedia(true);
    try {
      await api.product.uploadProductModel(productId, selectedProductModel, modelPreviewScreenshot ?? undefined);
      toast.success("3D model uploaded successfully");
      setProductModelDialogOpen(false);
      setSelectedProductModel(null);
      setModelPreviewScreenshot(null);
      if (modelPreviewImageUrl) {
        URL.revokeObjectURL(modelPreviewImageUrl);
        setModelPreviewImageUrl(null);
      }
      loadProduct();
      loadPrintAreas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload 3D model");
    } finally {
      setUploadingProductMedia(false);
    }
  };

  const handleRemoveProductModel = async () => {
    setUploadingProductMedia(true);
    try {
      await api.product.deleteProductModel(productId);
      toast.success("3D model removed successfully");
      setProductModelDialogOpen(false);
      loadProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove 3D model");
    } finally {
      setUploadingProductMedia(false);
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

      {/* Product Image and 3D Model */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Product Image</CardTitle>
              <CardDescription>Generic product image (can be overridden by variant image)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setProductImageDialogOpen(true)}>
              <ImageIcon className="mr-2 size-4" />
              {product.imageUrl ? "Change" : "Upload"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-muted relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center">
                  <ImageIcon className="mb-2 size-8" />
                  <span className="text-sm">No image</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">3D Model</CardTitle>
              <CardDescription>GLB file for 3D product preview</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setProductModelDialogOpen(true)}>
              <Box className="mr-2 size-4" />
              {product.modelUrl ? "Change" : "Upload"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-muted relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border">
              {product.modelPreviewUrl ? (
                <Image src={product.modelPreviewUrl} alt={`${product.name} 3D preview`} fill className="object-cover" />
              ) : product.modelUrl ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Box className="text-primary mx-auto mb-2 size-12" />
                  <span className="text-sm font-medium">3D Model uploaded</span>
                  <p className="text-muted-foreground mt-1 text-xs">No preview available</p>
                </div>
              ) : (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center">
                  <Box className="mx-auto mb-2 size-8" />
                  <span className="text-sm">No 3D model</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Areas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5" />
              Print Areas
            </CardTitle>
            <CardDescription>Define where designs can be placed on the 3D model</CardDescription>
          </div>
          <div className="flex gap-2">
            {printAreas.length === 0 && (
              <Button variant="outline" size="sm" onClick={addDefaultPrintAreas} disabled={printAreaSubmitting}>
                Add Default Areas
              </Button>
            )}
            <Button size="sm" onClick={() => setPrintAreaDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Area
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {printAreasLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : printAreas.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
              <MapPin className="mb-2 size-8 opacity-50" />
              <p className="text-sm">No print areas configured</p>
              <p className="text-xs">Add print areas to enable design placement on this product</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mesh Reference</TableHead>
                  <TableHead>Ray Direction</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printAreas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-mono text-sm">{area.areaId}</TableCell>
                    <TableCell>{area.name}</TableCell>
                    <TableCell className="font-mono text-sm">{area.meshName || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      [{area.rayDirection.map((v) => v.toFixed(1)).join(", ")}]
                    </TableCell>
                    <TableCell>
                      <Badge variant={area.isAutoDetected ? "secondary" : "default"}>
                        {area.isAutoDetected ? "Auto" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditPrintArea(area)}>
                          <Edit className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeletePrintArea(area)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      {/* Product Image Upload Dialog */}
      <Dialog open={productImageDialogOpen} onOpenChange={setProductImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Image</DialogTitle>
            <DialogDescription>
              Upload a generic product image. This will be shown when no variant image is available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current Product Image */}
            {product?.imageUrl && (
              <div className="space-y-2">
                <Label>Current Image</Label>
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                  <Image src={product.imageUrl} alt="Current product image" fill className="object-cover" />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleRemoveProductImage}
                  disabled={uploadingProductMedia}
                >
                  {uploadingProductMedia ? "Removing..." : "Remove Image"}
                </Button>
              </div>
            )}

            {/* Image Preview */}
            {productImagePreview && !product?.imageUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                  <Image src={productImagePreview} alt="Preview" fill className="object-cover" />
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="space-y-2">
              <Label>{product?.imageUrl ? "Replace Image" : "Upload Image"}</Label>
              <input
                ref={productImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleProductImageSelect}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => productImageInputRef.current?.click()}
                  disabled={uploadingProductMedia}
                >
                  <ImageIcon className="mr-2 size-4" />
                  Choose File
                </Button>
                {selectedProductImage && (
                  <Button onClick={handleProductImageUpload} disabled={uploadingProductMedia}>
                    {uploadingProductMedia ? "Uploading..." : "Upload"}
                  </Button>
                )}
              </div>
              {selectedProductImage && (
                <p className="text-muted-foreground text-xs">Selected: {selectedProductImage.name}</p>
              )}
              <p className="text-muted-foreground text-xs">Supported formats: JPEG, PNG, WebP, GIF. Max size: 10MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductImageDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product 3D Model Upload Dialog */}
      <Dialog open={productModelDialogOpen} onOpenChange={setProductModelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>3D Model</DialogTitle>
            <DialogDescription>Upload a .glb file for 3D product preview in the design tool.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current Model Status */}
            {product?.modelUrl && !selectedProductModel && (
              <div className="space-y-2">
                <Label>Current 3D Model</Label>
                <div className="bg-muted relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border">
                  {product.modelPreviewUrl ? (
                    <Image src={product.modelPreviewUrl} alt="Current model preview" fill className="object-cover" />
                  ) : (
                    <div className="text-center">
                      <Box className="text-primary mx-auto mb-2 size-12" />
                      <span className="text-sm font-medium">3D Model uploaded</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleRemoveProductModel}
                  disabled={uploadingProductMedia}
                >
                  {uploadingProductMedia ? "Removing..." : "Remove 3D Model"}
                </Button>
              </div>
            )}

            {/* 3D Preview of selected file */}
            {selectedProductModel && (
              <div className="space-y-2">
                <Label>3D Preview</Label>
                <ModelPreview
                  file={selectedProductModel}
                  onScreenshotReady={(file) => {
                    setModelPreviewScreenshot(file);
                    setModelPreviewImageUrl(URL.createObjectURL(file));
                  }}
                  onError={(msg) => toast.error(msg)}
                />
                {modelPreviewImageUrl && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Auto-captured preview</Label>
                    <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                      <Image src={modelPreviewImageUrl} alt="Model screenshot" fill className="object-contain" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Section */}
            <div className="space-y-2">
              <Label>{product?.modelUrl ? "Replace 3D Model" : "Upload 3D Model"}</Label>
              <input
                ref={productModelInputRef}
                type="file"
                accept=".glb"
                onChange={handleProductModelSelect}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => productModelInputRef.current?.click()}
                  disabled={uploadingProductMedia}
                >
                  <Box className="mr-2 size-4" />
                  Choose File
                </Button>
                {selectedProductModel && (
                  <Button
                    onClick={handleProductModelUpload}
                    disabled={uploadingProductMedia || !modelPreviewScreenshot}
                  >
                    {uploadingProductMedia
                      ? "Uploading..."
                      : !modelPreviewScreenshot
                        ? "Generating preview..."
                        : "Upload"}
                  </Button>
                )}
              </div>
              {selectedProductModel && (
                <p className="text-muted-foreground text-xs">Selected: {selectedProductModel.name}</p>
              )}
              <p className="text-muted-foreground text-xs">Supported format: GLB. Max size: 50MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductModelDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Print Area Dialog */}
      <Dialog open={printAreaDialogOpen} onOpenChange={setPrintAreaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Print Area</DialogTitle>
            <DialogDescription>Define a new printable area on the product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area ID</Label>
                <Input
                  placeholder="e.g., front, back, left-sleeve"
                  value={printAreaFormData.areaId}
                  onChange={(e) => setPrintAreaFormData((p) => ({ ...p, areaId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="e.g., Front, Back, Left Sleeve"
                  value={printAreaFormData.name}
                  onChange={(e) => setPrintAreaFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mesh Name (Optional)</Label>
              <Input
                placeholder="Name of the mesh in the GLB model"
                value={printAreaFormData.meshName}
                onChange={(e) => setPrintAreaFormData((p) => ({ ...p, meshName: e.target.value }))}
              />
              <p className="text-muted-foreground text-xs">
                If specified, designs will be placed on this specific mesh in the 3D model.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Ray Direction</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-muted-foreground text-xs">X</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={printAreaFormData.rayDirectionX}
                    onChange={(e) => setPrintAreaFormData((p) => ({ ...p, rayDirectionX: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Y</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={printAreaFormData.rayDirectionY}
                    onChange={(e) => setPrintAreaFormData((p) => ({ ...p, rayDirectionY: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Z</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={printAreaFormData.rayDirectionZ}
                    onChange={(e) => setPrintAreaFormData((p) => ({ ...p, rayDirectionZ: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Direction used for raycasting to find the surface. Common values: Front [0,0,1], Back [0,0,-1]
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintAreaDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrintArea} disabled={printAreaSubmitting}>
              {printAreaSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Print Area Dialog */}
      <Dialog open={editPrintAreaDialogOpen} onOpenChange={setEditPrintAreaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Print Area</DialogTitle>
            <DialogDescription>Update print area configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area ID</Label>
                <Input
                  placeholder="e.g., front, back, left-sleeve"
                  value={printAreaFormData.areaId}
                  onChange={(e) => setPrintAreaFormData((p) => ({ ...p, areaId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="e.g., Front, Back, Left Sleeve"
                  value={printAreaFormData.name}
                  onChange={(e) => setPrintAreaFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mesh Name (Optional)</Label>
              <Input
                placeholder="Name of the mesh in the GLB model"
                value={printAreaFormData.meshName}
                onChange={(e) => setPrintAreaFormData((p) => ({ ...p, meshName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Ray Direction</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-muted-foreground text-xs">X</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={printAreaFormData.rayDirectionX}
                    onChange={(e) => setPrintAreaFormData((p) => ({ ...p, rayDirectionX: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Y</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={printAreaFormData.rayDirectionY}
                    onChange={(e) => setPrintAreaFormData((p) => ({ ...p, rayDirectionY: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Z</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={printAreaFormData.rayDirectionZ}
                    onChange={(e) => setPrintAreaFormData((p) => ({ ...p, rayDirectionZ: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPrintAreaDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePrintArea} disabled={printAreaSubmitting}>
              {printAreaSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Print Area Dialog */}
      <AlertDialog open={deletePrintAreaDialogOpen} onOpenChange={setDeletePrintAreaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Print Area</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{selectedPrintArea?.name}&quot; print area? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrintArea}
              disabled={printAreaSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {printAreaSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
