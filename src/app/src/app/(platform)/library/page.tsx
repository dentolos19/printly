"use client";

import { FallbackImage } from "@/app/(tools)/shared/components/fallback-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import type { Asset } from "@/lib/server/asset";
import type { Design } from "@/lib/server/design";
import type { Imprint } from "@/lib/server/imprint";
import {
  Box,
  Copy,
  Download,
  Edit3,
  FileImage,
  ImageIcon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type DesignWithPreview = Design & {
  preview?: string;
};

export default function LibraryPage() {
  const router = useRouter();
  const { api } = useServer();

  const [activeTab, setActiveTab] = useState("designs");
  const [searchQuery, setSearchQuery] = useState("");

  // Designs
  const [designs, setDesigns] = useState<DesignWithPreview[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);

  // Imprints
  const [imprints, setImprints] = useState<Imprint[]>([]);
  const [imprintsLoading, setImprintsLoading] = useState(true);

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Dialogs
  const [selectedDesign, setSelectedDesign] = useState<DesignWithPreview | null>(null);
  const [selectedImprint, setSelectedImprint] = useState<Imprint | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetDetailOpen, setAssetDetailOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // Load designs
  const loadDesigns = useCallback(async () => {
    try {
      setDesignsLoading(true);
      const data = await api.design.getDesigns();

      const designsWithPreviews = await Promise.all(
        data.map(async (design) => {
          let preview: string | undefined;

          if (design.coverId) {
            try {
              const blob = await api.design.getDesignCover(design.id);
              preview = URL.createObjectURL(blob);
            } catch (error) {
              console.error("Failed to load cover:", error);
            }
          }

          return { ...design, preview };
        }),
      );

      setDesigns(designsWithPreviews);
    } catch (error) {
      toast.error("Failed to load designs");
      console.error(error);
    } finally {
      setDesignsLoading(false);
    }
  }, [api.design]);

  // Load imprints
  const loadImprints = useCallback(async () => {
    try {
      setImprintsLoading(true);
      const data = await api.imprint.getImprints();
      setImprints(data);
    } catch (error) {
      toast.error("Failed to load imprints");
      console.error(error);
    } finally {
      setImprintsLoading(false);
    }
  }, [api.imprint]);

  // Load assets
  const loadAssets = useCallback(async () => {
    try {
      setAssetsLoading(true);
      const data = await api.asset.getAssets();
      setAssets(data);

      const urls: Record<string, string> = {};
      data.forEach((asset) => {
        urls[asset.id] = `/assets/${asset.id}/view`;
      });
      setImageUrls(urls);
    } catch (error) {
      toast.error("Failed to load assets");
      console.error(error);
    } finally {
      setAssetsLoading(false);
    }
  }, [api.asset]);

  useEffect(() => {
    loadDesigns();
    loadImprints();
    loadAssets();

    // Cleanup object URLs on unmount to prevent memory leaks
    return () => {
      designs.forEach((d) => {
        if (d.preview?.startsWith("blob:")) URL.revokeObjectURL(d.preview);
      });
    };
  }, [loadDesigns, loadImprints, loadAssets]);

  // Filter items by search query
  const filteredDesigns = designs.filter((design) => design.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredImprints = imprints.filter((imprint) => imprint.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredAssets = assets.filter((asset) => asset.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Design handlers
  const handleOpenRenameDesign = (design: DesignWithPreview) => {
    setSelectedDesign(design);
    setNewName(design.name);
    setNewDescription(design.description || "");
    setRenameDialogOpen(true);
  };

  const handleRenameDesign = async () => {
    if (!selectedDesign || !newName.trim()) return;

    try {
      const updated = await api.design.updateDesign(selectedDesign.id, {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });

      setDesigns((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, name: updated.name, description: updated.description } : d)),
      );

      toast.success("Design renamed successfully");
      setRenameDialogOpen(false);
      setSelectedDesign(null);
    } catch (error) {
      toast.error("Failed to rename design");
      console.error(error);
    }
  };

  const handleDuplicateDesign = async (design: DesignWithPreview) => {
    try {
      const newDesign = await api.design.createDesign({
        name: `${design.name} (Copy)`,
        description: design.description,
        data: design.data,
      });

      setDesigns((prev) => [{ ...newDesign, preview: design.preview }, ...prev]);
      toast.success("Design duplicated successfully");
    } catch (error) {
      toast.error("Failed to duplicate design");
      console.error(error);
    }
  };

  const handleOpenDeleteDesign = (design: DesignWithPreview) => {
    setSelectedDesign(design);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDesign = async () => {
    if (!selectedDesign) return;

    try {
      await api.design.deleteDesign(selectedDesign.id);
      setDesigns((prev) => prev.filter((d) => d.id !== selectedDesign.id));
      toast.success("Design deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedDesign(null);
    } catch (error) {
      toast.error("Failed to delete design");
      console.error(error);
    }
  };

  // Imprint handlers
  const handleDeleteImprint = async (imprint: Imprint) => {
    if (!confirm("Are you sure you want to delete this imprint?")) return;

    try {
      await api.imprint.deleteImprint(imprint.id);
      setImprints((prev) => prev.filter((i) => i.id !== imprint.id));
      toast.success("Imprint deleted successfully");
    } catch (error) {
      toast.error("Failed to delete imprint");
      console.error(error);
    }
  };

  // Asset handlers
  const handleUploadAsset = async () => {
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const asset = await api.asset.uploadAsset(uploadFile, uploadDescription);
      setAssets((prev) => [asset, ...prev]);
      setImageUrls((prev) => ({ ...prev, [asset.id]: `/assets/${asset.id}/view` }));
      toast.success("Asset uploaded successfully");
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadDescription("");
    } catch (error) {
      toast.error("Failed to upload asset");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      await api.asset.deleteAsset(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.success("Asset deleted successfully");
      setAssetDetailOpen(false);
    } catch (error) {
      toast.error("Failed to delete asset");
      console.error(error);
    }
  };

  const openAssetDetail = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetDetailOpen(true);
  };

  // Utilities
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCanvasSize = (design: Design): string => {
    try {
      const parsed = JSON.parse(design.data);
      if (parsed.canvasSize) {
        return `${parsed.canvasSize.width} × ${parsed.canvasSize.height}`;
      }
    } catch {
      // Ignore parse errors
    }
    return "Unknown size";
  };

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Library</h1>
        <p className="text-muted-foreground text-lg">Manage your designs, imprints, and assets in one place</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="designs" className="gap-2">
            <FileImage className="h-4 w-4" />
            Designs
            {!designsLoading && <span className="text-muted-foreground text-xs">({filteredDesigns.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="imprints" className="gap-2">
            <Box className="h-4 w-4" />
            Imprints
            {!imprintsLoading && <span className="text-muted-foreground text-xs">({filteredImprints.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Assets
            {!assetsLoading && <span className="text-muted-foreground text-xs">({filteredAssets.length})</span>}
          </TabsTrigger>
        </TabsList>

        {/* Designs Tab */}
        <TabsContent value="designs" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Create and manage your custom designs</p>
            <Button asChild>
              <Link href="/designer/new">
                <Plus className="mr-2 h-4 w-4" />
                New Design
              </Link>
            </Button>
          </div>

          {designsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden p-0">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="mt-3 h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredDesigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-primary/10 mb-4 rounded-full p-4">
                  <FileImage className="text-primary h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{searchQuery ? "No designs found" : "No designs yet"}</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  {searchQuery ? "Try adjusting your search query" : "Create your first design to get started"}
                </p>
                {!searchQuery && (
                  <Button asChild>
                    <Link href="/designer/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Design
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDesigns.map((design) => (
                <Card
                  key={design.id}
                  className="group hover:border-primary/50 m-0 cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:shadow-lg"
                  onClick={() => router.push(`/designer/${design.id}`)}
                >
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    {design.preview ? (
                      <img
                        src={design.preview}
                        alt={design.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <FileImage className="text-muted-foreground h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold">{design.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/designer/${design.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRenameDesign(design);
                            }}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateDesign(design);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteDesign(design);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
                      <span className="bg-primary/10 text-primary rounded px-2 py-1 font-medium">
                        {getCanvasSize(design)}
                      </span>
                      <span>{formatDate(design.updatedAt)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Imprints Tab */}
        <TabsContent value="imprints" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Configure 3D product imprints for your designs</p>
            <Button asChild>
              <Link href="/imprinter/new">
                <Plus className="mr-2 h-4 w-4" />
                New Imprint
              </Link>
            </Button>
          </div>

          {imprintsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="mt-3 h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredImprints.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-primary/10 mb-4 rounded-full p-4">
                  <Box className="text-primary h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{searchQuery ? "No imprints found" : "No imprints yet"}</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first imprint to visualize designs on 3D products"}
                </p>
                {!searchQuery && (
                  <Button asChild>
                    <Link href="/imprinter/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Imprint
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredImprints.map((imprint) => (
                <Card
                  key={imprint.id}
                  className="group hover:border-primary/50 m-0 cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:shadow-lg"
                  onClick={() => router.push(`/imprinter/${imprint.id}`)}
                >
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    {imprint.previewId ? (
                      <FallbackImage
                        src={`/assets/${imprint.previewId}/view`}
                        alt={imprint.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Box className="text-muted-foreground h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 font-semibold">{imprint.name}</h3>
                        {imprint.productName && (
                          <p className="text-muted-foreground line-clamp-1 text-sm">{imprint.productName}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/imprinter/${imprint.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImprint(imprint);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
                      <span className="bg-primary/10 text-primary rounded px-2 py-1 font-medium">
                        ${imprint.customizationPrice.toFixed(2)}
                      </span>
                      <span>{formatDate(imprint.updatedAt)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Upload and manage your image assets</p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Asset
            </Button>
          </div>

          {assetsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden p-0">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="mt-3 h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-primary/10 mb-4 rounded-full p-4">
                  <ImageIcon className="text-primary h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{searchQuery ? "No assets found" : "No assets yet"}</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  {searchQuery ? "Try adjusting your search query" : "Upload your first image asset to use in designs"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Your First Asset
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAssets.map((asset) => (
                <Card
                  key={asset.id}
                  className="group hover:border-primary/50 m-0 cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:shadow-lg"
                  onClick={() => openAssetDetail(asset)}
                >
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    {imageUrls[asset.id] ? (
                      <FallbackImage
                        src={imageUrls[asset.id]}
                        alt={asset.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <ImageIcon className="text-muted-foreground h-12 w-12" />
                      </div>
                    )}
                    {asset.isGenerated && (
                      <div className="bg-primary/90 absolute top-2 right-2 rounded-full p-1.5">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold">{asset.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={imageUrls[asset.id]} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAsset(asset);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
                      <span className="bg-primary/10 text-primary rounded px-2 py-1 font-medium">
                        {formatFileSize(asset.size)}
                      </span>
                      <span>{formatDate(asset.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Design</DialogTitle>
            <DialogDescription>Update the name and description of your design</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter design name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Enter design description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameDesign} disabled={!newName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Design</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDesign?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDesign}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Asset</DialogTitle>
            <DialogDescription>Upload an image to use in your designs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-description">Description</Label>
              <Textarea
                id="upload-description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Enter asset description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadAsset} disabled={!uploadFile || uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Detail Dialog */}
      <Dialog open={assetDetailOpen} onOpenChange={setAssetDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.name}</DialogTitle>
            {selectedAsset?.description && <DialogDescription>{selectedAsset.description}</DialogDescription>}
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
                {imageUrls[selectedAsset.id] && (
                  <FallbackImage
                    src={imageUrls[selectedAsset.id]}
                    alt={selectedAsset.name}
                    className="size-full object-contain"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{selectedAsset.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-medium">{formatFileSize(selectedAsset.size)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">{formatDate(selectedAsset.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Generated:</span>
                  <p className="font-medium">{selectedAsset.isGenerated ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetDetailOpen(false)}>
              Close
            </Button>
            {selectedAsset && (
              <Button asChild>
                <a href={imageUrls[selectedAsset.id]} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
