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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import type { Asset } from "@/lib/server/asset";
import type { Design } from "@/lib/server/design";
import type { Imprint } from "@/lib/server/imprint";
import {
  Box,
  Copy,
  DownloadIcon,
  Edit3,
  FileText,
  ImageIcon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SparklesIcon,
  Trash2,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type DesignWithPreview = Design & {
  preview?: string;
};

export default function Page() {
  const router = useRouter();
  const { api } = useServer();

  // Design states
  const [designs, setDesigns] = useState<DesignWithPreview[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Imprint states
  const [imprints, setImprints] = useState<Imprint[]>([]);
  const [imprintsLoading, setImprintsLoading] = useState(true);

  // Asset states
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Design dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<DesignWithPreview | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Asset dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // Generate states
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  // Load designs
  const loadDesigns = useCallback(() => {
    setDesignsLoading(true);
    api.design
      .getDesigns()
      .then(async (data) => {
        // Load cover images for designs that have them
        const designsWithPreviews = await Promise.all(
          data.map(async (design) => {
            let preview: string | undefined;
            if (design.coverId) {
              try {
                const blob = await api.design.getDesignCover(design.id);
                preview = URL.createObjectURL(blob);
              } catch {
                // Fallback to parsing canvas data if cover fetch fails
              }
            }
            if (!preview) {
              try {
                const parsed = JSON.parse(design.data);
                if (parsed.objects && Array.isArray(parsed.objects)) {
                  const imageObj = parsed.objects.find((obj: { type?: string }) => obj.type === "image");
                  if (imageObj && imageObj.src) {
                    preview = imageObj.src;
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
            return { ...design, preview };
          }),
        );
        setDesigns(designsWithPreviews);
      })
      .catch((error) => {
        toast.error("Failed to load designs");
        console.error(error);
      })
      .finally(() => {
        setDesignsLoading(false);
      });
  }, [api.design]);

  // Load assets
  const loadAssets = useCallback(async () => {
    try {
      setAssetsLoading(true);
      const data = await api.asset.getAssets();
      setAssets(data);

      // Build view URLs using public route
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

  // Load imprints
  const loadImprints = useCallback(() => {
    setImprintsLoading(true);
    api.imprint
      .getImprints()
      .then((data) => {
        setImprints(data);
      })
      .catch((error) => {
        toast.error("Failed to load imprints");
        console.error(error);
      })
      .finally(() => {
        setImprintsLoading(false);
      });
  }, [api.imprint]);

  useEffect(() => {
    loadDesigns();
    loadAssets();
    loadImprints();
  }, [loadDesigns, loadAssets, loadImprints]);

  // Handle rename
  function handleOpenRename(design: DesignWithPreview) {
    setSelectedDesign(design);
    setNewName(design.name);
    setNewDescription(design.description || "");
    setRenameDialogOpen(true);
  }

  function handleRename() {
    if (!selectedDesign || !newName.trim()) return;

    api.design
      .updateDesign(selectedDesign.id, {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      })
      .then((updated) => {
        setDesigns((prev) =>
          prev.map((d) => (d.id === updated.id ? { ...d, name: updated.name, description: updated.description } : d)),
        );
        toast.success("Design renamed successfully");
        setRenameDialogOpen(false);
        setSelectedDesign(null);
      })
      .catch((error) => {
        toast.error("Failed to rename design");
        console.error(error);
      });
  }

  // Handle duplicate
  function handleDuplicate(design: DesignWithPreview) {
    api.design
      .createDesign({
        name: `${design.name} (Copy)`,
        description: design.description,
        data: design.data,
      })
      .then((newDesign) => {
        setDesigns((prev) => [{ ...newDesign, preview: design.preview }, ...prev]);
        toast.success("Design duplicated successfully");
      })
      .catch((error) => {
        toast.error("Failed to duplicate design");
        console.error(error);
      });
  }

  // Handle delete
  function handleOpenDelete(design: DesignWithPreview) {
    setSelectedDesign(design);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!selectedDesign) return;

    api.design
      .deleteDesign(selectedDesign.id)
      .then(() => {
        setDesigns((prev) => prev.filter((d) => d.id !== selectedDesign.id));
        toast.success("Design deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedDesign(null);
      })
      .catch((error) => {
        toast.error("Failed to delete design");
        console.error(error);
      });
  }

  // Asset handlers
  const handleUpload = async () => {
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

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      setGenerating(true);
      const { blob } = await api.generate.generateImage(generatePrompt);
      const file = new File([blob], `generated-${Date.now()}.png`, { type: blob.type });
      const asset = await api.asset.uploadAsset(file, `Generated: ${generatePrompt}`);
      setAssets((prev) => [asset, ...prev]);
      setImageUrls((prev) => ({ ...prev, [asset.id]: `/assets/${asset.id}/view` }));
      toast.success("Image generated successfully");
      setGenerateDialogOpen(false);
      setGeneratePrompt("");
    } catch (error) {
      toast.error("Failed to generate image");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAsset = (asset: Asset) => {
    window.open(`/assets/${asset.id}/view`, "_blank");
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm("Are you sure you want to delete this asset?")) {
      return;
    }

    try {
      await api.asset.deleteAsset(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.success("Asset deleted successfully");
      setDetailDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete asset");
      console.error(error);
    }
  };

  const openAssetDetail = (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailDialogOpen(true);
  };

  // Format date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Get canvas size from design data
  function getCanvasSize(design: Design): string {
    try {
      const parsed = JSON.parse(design.data);
      if (parsed.canvasSize) {
        return `${parsed.canvasSize.width} × ${parsed.canvasSize.height}`;
      }
    } catch {
      // Ignore parse errors
    }
    return "Unknown size";
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render asset card
  const renderAssetCard = (asset: Asset) => (
    <Card
      key={asset.id}
      className={
        "group hover:border-primary/50 relative cursor-pointer gap-0 overflow-hidden border-2 p-0 transition-all hover:shadow-2xl"
      }
      onClick={() => openAssetDetail(asset)}
    >
      <div className={"bg-muted relative aspect-square w-full overflow-hidden"}>
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {imageUrls[asset.id] ? (
          <img
            src={imageUrls[asset.id]}
            alt={asset.name}
            className={"size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"}
          />
        ) : (
          <div className={"bg-muted flex size-full items-center justify-center"}>
            <Spinner className={"text-muted-foreground"} />
          </div>
        )}
        {asset.isGenerated && (
          <div
            className={
              "absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-linear-to-r from-violet-500/90 to-purple-500/90 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm"
            }
          >
            <SparklesIcon className={"size-3"} />
            <span>AI Generated</span>
          </div>
        )}
      </div>
      <div className={"p-4"}>
        <div className={"space-y-2"}>
          <h3 className={"group-hover:text-primary truncate font-semibold transition-colors"}>{asset.name}</h3>
          {asset.description && (
            <p className={"text-muted-foreground line-clamp-2 text-sm leading-relaxed"}>{asset.description}</p>
          )}
          <div className={"text-muted-foreground flex items-center justify-between border-t pt-2.5 text-xs"}>
            <span className={"font-semibold"}>{formatFileSize(asset.size)}</span>
            <span
              className={
                "bg-secondary rounded-md px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase"
              }
            >
              {asset.type.split("/")[1] || "FILE"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );

  // Filter designs by search query
  const filteredDesigns = designs.filter((design) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      design.name.toLowerCase().includes(query) ||
      (design.description && design.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className={"container mx-auto space-y-8 p-6"}>
      {/* Header */}
      <div className={"space-y-3"}>
        <h1 className={"text-4xl font-bold tracking-tight md:text-5xl"}>Library</h1>
        <p className={"text-muted-foreground text-lg md:text-xl"}>
          Manage your designs, imprints, and assets in one place
        </p>
      </div>

      <Tabs defaultValue={"designs"} className={"w-full"}>
        <TabsList className={"grid h-auto w-full max-w-2xl grid-cols-3 p-1"}>
          <TabsTrigger value={"designs"} className={"gap-2 py-3 text-base font-medium"}>
            <FileText className={"h-4 w-4"} />
            Designs
          </TabsTrigger>
          <TabsTrigger value={"imprints"} className={"gap-2 py-3 text-base font-medium"}>
            <Box className={"h-4 w-4"} />
            Imprints
          </TabsTrigger>
          <TabsTrigger value={"assets"} className={"gap-2 py-3 text-base font-medium"}>
            <ImageIcon className={"h-4 w-4"} />
            Assets
          </TabsTrigger>
        </TabsList>

        {/* Designs Tab */}
        <TabsContent value={"designs"} className={"mt-8 space-y-6"}>
          <div className={"flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
            <div className={"relative max-w-md flex-1"}>
              <Search className={"text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"} />
              <Input
                type={"search"}
                placeholder={"Search designs by name or description..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={"h-11 pl-10 shadow-sm"}
              />
            </div>
            <Button type={"button"} size={"lg"} className={"gap-2 shadow-sm"} asChild>
              <Link href={"/designer/new"}>
                <Plus className={"h-4 w-4"} />
                New Design
              </Link>
            </Button>
          </div>

          {/* Loading state */}
          {designsLoading && (
            <div className={"grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-2">
                  <CardHeader className={"p-0"}>
                    <Skeleton className={"aspect-4/3 w-full rounded-none"} />
                  </CardHeader>
                  <CardContent className={"space-y-3 p-4"}>
                    <Skeleton className={"h-5 w-3/4"} />
                    <Skeleton className={"h-4 w-full"} />
                    <Skeleton className={"h-3 w-1/2"} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!designsLoading && designs.length === 0 && (
            <Card className={"border-dashed"}>
              <CardContent className={"flex flex-col items-center justify-center py-16"}>
                <div className={"bg-primary/10 mb-4 rounded-full p-4"}>
                  <FileText className={"text-primary h-8 w-8"} />
                </div>
                <h3 className={"mb-2 text-xl font-semibold"}>No designs yet</h3>
                <p className={"text-muted-foreground mb-6 text-center text-sm"}>
                  Create your first design to get started with your projects
                </p>
                <Button type={"button"} size={"lg"} asChild>
                  <Link href={"/designer/new"}>
                    <Plus className={"mr-2 h-5 w-5"} />
                    Create Your First Design
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* No search results */}
          {!designsLoading && designs.length > 0 && filteredDesigns.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant={"icon"}>
                  <Search className={"h-6 w-6"} />
                </EmptyMedia>
                <EmptyTitle>No designs found</EmptyTitle>
                <EmptyDescription>No designs match "{searchQuery}"</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type={"button"} variant={"outline"} onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </EmptyContent>
            </Empty>
          )}

          {/* Designs grid */}
          {!designsLoading && filteredDesigns.length > 0 && (
            <div className={"grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
              {filteredDesigns.map((design) => (
                <Card
                  key={design.id}
                  className={
                    "group hover:border-primary/50 relative gap-0 overflow-hidden border-2 p-0 transition-all hover:shadow-2xl"
                  }
                >
                  <Link href={`/designer/${design.id}`}>
                    <div className={"bg-muted relative aspect-4/3 w-full overflow-hidden"}>
                      <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      {design.preview ? (
                        <img
                          src={design.preview}
                          alt={design.name}
                          className={
                            "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          }
                        />
                      ) : (
                        <div className={"flex h-full w-full items-center justify-center"}>
                          <FileText className={"text-muted-foreground/30 h-12 w-12"} />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div
                        className={
                          "absolute inset-0 flex items-center justify-center bg-linear-to-t from-black/60 via-black/30 to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100"
                        }
                      >
                        <div
                          className={
                            "rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg transition-transform group-hover:scale-105"
                          }
                        >
                          <Pencil className={"mr-2 inline h-4 w-4"} />
                          Open Design
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className={"p-4"}>
                    <div className={"flex items-start justify-between gap-3"}>
                      <div className={"min-w-0 flex-1 space-y-1.5"}>
                        <Link href={`/designer/${design.id}`} className={"block"}>
                          <h3 className={"group-hover:text-primary truncate font-semibold transition-colors"}>
                            {design.name}
                          </h3>
                        </Link>
                        <p className={"text-muted-foreground line-clamp-2 text-sm leading-relaxed"}>
                          {design.description || "No description"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type={"button"}
                            variant={"ghost"}
                            size={"icon"}
                            className={"text-muted-foreground hover:text-foreground -mt-2 -mr-2 h-8 w-8 shrink-0"}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className={"h-4 w-4"} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={"end"}>
                          <DropdownMenuItem asChild>
                            <Link href={`/designer/${design.id}`}>
                              <Pencil className={"mr-2 h-4 w-4"} />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenRename(design)}>
                            <Edit3 className={"mr-2 h-4 w-4"} />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(design)}>
                            <Copy className={"mr-2 h-4 w-4"} />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className={"text-destructive"} onClick={() => handleOpenDelete(design)}>
                            <Trash2 className={"mr-2 h-4 w-4"} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div
                      className={"text-muted-foreground mt-4 flex items-center justify-between border-t pt-3 text-xs"}
                    >
                      <span className={"bg-primary/10 text-primary rounded-md px-2 py-1 font-medium"}>
                        {getCanvasSize(design)}
                      </span>
                      <span className={"font-medium"}>{formatDate(design.updatedAt)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Imprints Tab */}
        <TabsContent value={"imprints"} className={"mt-8 space-y-6"}>
          <div className={"flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
            <p className={"text-muted-foreground text-base"}>Configure 3D product imprints for your designs</p>
            <Button type={"button"} size={"lg"} className={"gap-2 shadow-sm"} asChild>
              <Link href={"/imprinter/new"}>
                <Plus className={"h-4 w-4"} />
                New Imprint
              </Link>
            </Button>
          </div>

          {/* Loading state */}
          {imprintsLoading && (
            <div className={"grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-2">
                  <CardHeader className={"p-0"}>
                    <Skeleton className={"aspect-4/3 w-full rounded-none"} />
                  </CardHeader>
                  <CardContent className={"space-y-3 p-4"}>
                    <Skeleton className={"h-5 w-3/4"} />
                    <Skeleton className={"h-4 w-full"} />
                    <Skeleton className={"h-3 w-1/2"} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!imprintsLoading && imprints.length === 0 && (
            <Card className={"border-dashed"}>
              <CardContent className={"flex flex-col items-center justify-center py-16"}>
                <div className={"bg-primary/10 mb-4 rounded-full p-4"}>
                  <Box className={"text-primary h-8 w-8"} />
                </div>
                <h3 className={"mb-2 text-xl font-semibold"}>No imprints yet</h3>
                <p className={"text-muted-foreground mb-6 text-center text-sm"}>
                  Create your first imprint to visualize designs on 3D products
                </p>
                <Button type={"button"} size={"lg"} asChild>
                  <Link href={"/imprinter/new"}>
                    <Plus className={"mr-2 h-5 w-5"} />
                    Create Your First Imprint
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Imprints grid */}
          {!imprintsLoading && imprints.length > 0 && (
            <div className={"grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
              {imprints.map((imprint) => (
                <Card
                  key={imprint.id}
                  className={
                    "group hover:border-primary/50 relative gap-0 overflow-hidden border-2 p-0 transition-all hover:shadow-2xl"
                  }
                >
                  <Link href={`/imprinter/${imprint.id}`}>
                    <div className={"bg-muted relative aspect-4/3 w-full overflow-hidden"}>
                      <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      {imprint.previewId ? (
                        <img
                          src={`/assets/${imprint.previewId}/view`}
                          alt={imprint.name}
                          className={"h-full w-full object-cover"}
                        />
                      ) : (
                        <div className={"flex h-full w-full items-center justify-center"}>
                          <Box className={"text-muted-foreground/30 h-12 w-12"} />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div
                        className={
                          "absolute inset-0 flex items-center justify-center bg-linear-to-t from-black/60 via-black/30 to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100"
                        }
                      >
                        <div
                          className={
                            "rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg transition-transform group-hover:scale-105"
                          }
                        >
                          <Pencil className={"mr-2 inline h-4 w-4"} />
                          Open Imprint
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className={"p-4"}>
                    <div className={"flex items-start justify-between gap-3"}>
                      <div className={"min-w-0 flex-1 space-y-1.5"}>
                        <Link href={`/imprinter/${imprint.id}`} className={"block"}>
                          <h3 className={"group-hover:text-primary truncate font-semibold transition-colors"}>
                            {imprint.name}
                          </h3>
                        </Link>
                        <p className={"text-muted-foreground line-clamp-2 text-sm leading-relaxed"}>
                          {imprint.description || "No description"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type={"button"}
                            variant={"ghost"}
                            size={"icon"}
                            className={"text-muted-foreground hover:text-foreground -mt-2 -mr-2 h-8 w-8 shrink-0"}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className={"h-4 w-4"} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={"end"}>
                          <DropdownMenuItem asChild>
                            <Link href={`/imprinter/${imprint.id}`}>
                              <Pencil className={"mr-2 h-4 w-4"} />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={"text-destructive"}
                            onClick={async () => {
                              if (!confirm(`Delete "${imprint.name}"?`)) return;
                              try {
                                await api.imprint.deleteImprint(imprint.id);
                                setImprints((prev) => prev.filter((i) => i.id !== imprint.id));
                                toast.success("Imprint deleted successfully");
                              } catch (error) {
                                toast.error("Failed to delete imprint");
                                console.error(error);
                              }
                            }}
                          >
                            <Trash2 className={"mr-2 h-4 w-4"} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div
                      className={"text-muted-foreground mt-4 flex items-center justify-between border-t pt-3 text-xs"}
                    >
                      <span className={"bg-primary/10 text-primary rounded-md px-2 py-1 font-medium"}>3D Imprint</span>
                      <span className={"font-medium"}>{formatDate(imprint.updatedAt)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value={"assets"} className={"mt-8 space-y-6"}>
          <div className={"flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
            <p className={"text-muted-foreground text-base"}>Upload images or generate stunning visuals with AI</p>
            <div className={"flex gap-3"}>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size={"lg"} className={"gap-2 shadow-sm"}>
                    <UploadIcon className="h-4 w-4" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Asset</DialogTitle>
                    <DialogDescription>Upload an image to your asset library</DialogDescription>
                  </DialogHeader>
                  <div className={"space-y-4"}>
                    <div>
                      <Label htmlFor={"file"}>File</Label>
                      <Input
                        id={"file"}
                        type={"file"}
                        accept={"image/*"}
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={"description"}>Description (optional)</Label>
                      <Textarea
                        id={"description"}
                        placeholder={"Add a description for this asset..."}
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant={"outline"} onClick={() => setUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
                      {uploading ? <Spinner /> : <UploadIcon />}
                      Upload
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size={"lg"} variant={"outline"} className={"gap-2 shadow-sm"}>
                    <SparklesIcon className="h-4 w-4" />
                    Generate with AI
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Image</DialogTitle>
                    <DialogDescription>Use AI to generate an image from a text prompt</DialogDescription>
                  </DialogHeader>
                  <div className={"space-y-4"}>
                    <div>
                      <Label htmlFor={"prompt"}>Prompt</Label>
                      <Textarea
                        id={"prompt"}
                        placeholder={"Describe the image you want to generate..."}
                        value={generatePrompt}
                        onChange={(e) => setGeneratePrompt(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant={"outline"} onClick={() => setGenerateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={generating || !generatePrompt.trim()}>
                      {generating ? <Spinner /> : <SparklesIcon />}
                      Generate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {assetsLoading ? (
            <div className={"flex items-center justify-center py-12"}>
              <Spinner className={"size-8"} />
            </div>
          ) : assets.length === 0 ? (
            <Card className={"border-2 border-dashed"}>
              <CardContent className={"flex flex-col items-center justify-center py-20"}>
                <div className={"bg-primary/10 mb-6 rounded-2xl p-6"}>
                  <ImageIcon className={"text-primary h-12 w-12"} />
                </div>
                <h3 className={"mb-3 text-2xl font-semibold tracking-tight"}>No assets yet</h3>
                <p className={"text-muted-foreground mb-8 max-w-md text-center"}>
                  Upload your first asset or harness the power of AI to generate stunning, custom images for your
                  creative designs
                </p>
                <div className={"flex gap-4"}>
                  <Button size={"lg"} className="gap-2 shadow-lg" onClick={() => setUploadDialogOpen(true)}>
                    <UploadIcon className={"h-5 w-5"} />
                    Upload Asset
                  </Button>
                  <Button
                    size={"lg"}
                    variant={"outline"}
                    className="gap-2 shadow-sm"
                    onClick={() => setGenerateDialogOpen(true)}
                  >
                    <SparklesIcon className={"h-5 w-5"} />
                    Generate with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue={"all"} className={"w-full"}>
              <TabsList className={"mb-4 h-auto p-1"}>
                <TabsTrigger value={"all"} className="px-4 py-2.5 font-medium">
                  All Assets ({assets.length})
                </TabsTrigger>
                <TabsTrigger value={"uploaded"} className="px-4 py-2.5 font-medium">
                  Uploaded ({assets.filter((a) => !a.isGenerated).length})
                </TabsTrigger>
                <TabsTrigger value={"generated"} className="gap-1.5 px-4 py-2.5 font-medium">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  AI Generated ({assets.filter((a) => a.isGenerated).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={"all"} className={"mt-6"}>
                <div className={"grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}>
                  {assets.map((asset) => renderAssetCard(asset))}
                </div>
              </TabsContent>

              <TabsContent value={"uploaded"} className={"mt-6"}>
                <div className={"grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}>
                  {assets.filter((asset) => !asset.isGenerated).map((asset) => renderAssetCard(asset))}
                </div>
              </TabsContent>

              <TabsContent value={"generated"} className={"mt-6"}>
                <div className={"grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}>
                  {assets.filter((asset) => asset.isGenerated).map((asset) => renderAssetCard(asset))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Rename Design</DialogTitle>
            <DialogDescription className="text-base">
              Update the name and description for your design.
            </DialogDescription>
          </DialogHeader>
          <div className={"flex flex-col gap-5"}>
            <div className={"flex flex-col gap-2.5"}>
              <Label htmlFor={"design-name"} className="text-sm font-semibold">
                Name
              </Label>
              <Input
                id={"design-name"}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={"Enter design name"}
                className="h-11"
              />
            </div>
            <div className={"flex flex-col gap-2.5"}>
              <Label htmlFor={"design-description"} className="text-sm font-semibold">
                Description (optional)
              </Label>
              <Textarea
                id={"design-description"}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={"Add a description to help organize your work..."}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type={"button"} variant={"outline"} onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button type={"button"} onClick={handleRename} disabled={!newName.trim()} className="gap-2">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Design</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDesign?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={"bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asset Detail Dialog */}
      {selectedAsset && (
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className={"max-w-3xl"}>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl">{selectedAsset.name}</DialogTitle>
                  <DialogDescription className="mt-2 text-base">
                    {selectedAsset.isGenerated ? (
                      <span className="inline-flex items-center gap-1.5 text-violet-600">
                        <SparklesIcon className="h-4 w-4" />
                        AI Generated Image
                      </span>
                    ) : (
                      "Uploaded Image"
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className={"space-y-6"}>
              <div className={"bg-muted relative aspect-video overflow-hidden rounded-xl border-2"}>
                {imageUrls[selectedAsset.id] ? (
                  <img
                    src={imageUrls[selectedAsset.id]}
                    alt={selectedAsset.name}
                    className={"size-full object-contain"}
                  />
                ) : (
                  <div className={"flex size-full items-center justify-center"}>
                    <Spinner className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className={"bg-muted/50 space-y-3 rounded-xl p-5"}>
                {selectedAsset.description && (
                  <div className="space-y-1">
                    <strong className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                      Description
                    </strong>
                    <p className="text-sm leading-relaxed">{selectedAsset.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <strong className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Type
                    </strong>
                    <p className="font-mono text-sm">{selectedAsset.type}</p>
                  </div>
                  <div className="space-y-1">
                    <strong className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Size
                    </strong>
                    <p className="text-sm font-semibold">{formatFileSize(selectedAsset.size)}</p>
                  </div>
                  <div className="space-y-1">
                    <strong className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Created
                    </strong>
                    <p className="text-sm">
                      {new Date(selectedAsset.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className={"gap-3"}>
              <Button variant={"outline"} className="gap-2" onClick={() => handleDownloadAsset(selectedAsset)}>
                <DownloadIcon className="h-4 w-4" />
                Download
              </Button>
              <Button variant={"destructive"} className="gap-2" onClick={() => handleDeleteAsset(selectedAsset)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
