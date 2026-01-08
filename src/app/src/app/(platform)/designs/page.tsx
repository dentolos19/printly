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
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import type { Design } from "@/lib/server/design";
import { Copy, Edit3, FileText, MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  const [designs, setDesigns] = useState<DesignWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<DesignWithPreview | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Load designs
  const loadDesigns = useCallback(() => {
    setLoading(true);
    api.design
      .getDesigns()
      .then((data) => {
        // Parse design data to extract preview info
        const designsWithPreviews = data.map((design) => {
          let preview: string | undefined;
          try {
            const parsed = JSON.parse(design.data);
            // Try to get the first image object for preview
            if (parsed.objects && Array.isArray(parsed.objects)) {
              const imageObj = parsed.objects.find((obj: { type?: string }) => obj.type === "image");
              if (imageObj && imageObj.src) {
                preview = imageObj.src;
              }
            }
          } catch {
            // Ignore parse errors
          }
          return { ...design, preview };
        });
        setDesigns(designsWithPreviews);
      })
      .catch((error) => {
        toast.error("Failed to load designs");
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [api.design]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

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
    <div className={"container mx-auto p-6"}>
      {/* Header */}
      <div className={"mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
        <div>
          <h1 className={"text-3xl font-bold"}>Design Library</h1>
          <p className={"text-muted-foreground"}>Manage and edit your saved designs</p>
        </div>
        <Button type={"button"} asChild>
          <Link href={"/designer/new"}>
            <Plus className={"mr-2 h-4 w-4"} />
            New Design
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className={"mb-6"}>
        <div className={"relative max-w-md"}>
          <Search className={"text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"} />
          <Input
            type={"search"}
            placeholder={"Search designs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={"pl-10"}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className={"grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className={"p-0"}>
                <Skeleton className={"aspect-4/3 w-full rounded-t-lg"} />
              </CardHeader>
              <CardContent className={"p-4"}>
                <Skeleton className={"mb-2 h-5 w-3/4"} />
                <Skeleton className={"h-4 w-1/2"} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && designs.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant={"icon"}>
              <FileText className={"h-6 w-6"} />
            </EmptyMedia>
            <EmptyTitle>No designs yet</EmptyTitle>
            <EmptyDescription>Create your first design to get started</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type={"button"} asChild>
              <Link href={"/designer/new"}>
                <Plus className={"mr-2 h-4 w-4"} />
                Create Design
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {/* No search results */}
      {!loading && designs.length > 0 && filteredDesigns.length === 0 && (
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
      {!loading && filteredDesigns.length > 0 && (
        <div className={"grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
          {filteredDesigns.map((design) => (
            <Card key={design.id} className={"group cursor-pointer transition-shadow hover:shadow-lg"}>
              <CardHeader className={"p-0"}>
                <Link href={`/designer/${design.id}`}>
                  <div className={"bg-muted relative aspect-4/3 overflow-hidden rounded-t-lg"}>
                    {design.preview ? (
                      <img src={design.preview} alt={design.name} className={"h-full w-full object-cover"} />
                    ) : (
                      <div className={"flex h-full w-full items-center justify-center"}>
                        <FileText className={"text-muted-foreground/50 h-12 w-12"} />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div
                      className={
                        "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      }
                    >
                      <Button type={"button"} variant={"secondary"} size={"sm"}>
                        <Edit3 className={"mr-2 h-4 w-4"} />
                        Edit Design
                      </Button>
                    </div>
                  </div>
                </Link>
              </CardHeader>
              <CardContent className={"p-4"}>
                <div className={"flex items-start justify-between"}>
                  <div className={"min-w-0 flex-1"}>
                    <h3 className={"truncate font-semibold"}>{design.name}</h3>
                    {design.description && (
                      <p className={"text-muted-foreground line-clamp-1 text-sm"}>{design.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type={"button"}
                        variant={"ghost"}
                        size={"icon"}
                        className={"h-8 w-8 shrink-0"}
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
              </CardContent>
              <CardFooter className={"border-t px-4 py-2"}>
                <div className={"text-muted-foreground flex w-full items-center justify-between text-xs"}>
                  <span>{getCanvasSize(design)}</span>
                  <span>Edited {formatDate(design.updatedAt)}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Design</DialogTitle>
            <DialogDescription>Enter a new name and description for your design.</DialogDescription>
          </DialogHeader>
          <div className={"flex flex-col gap-4"}>
            <div className={"flex flex-col gap-2"}>
              <Label htmlFor={"design-name"}>Name</Label>
              <Input
                id={"design-name"}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={"Design name"}
              />
            </div>
            <div className={"flex flex-col gap-2"}>
              <Label htmlFor={"design-description"}>Description (optional)</Label>
              <Textarea
                id={"design-description"}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={"Add a description..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type={"button"} variant={"outline"} onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button type={"button"} onClick={handleRename} disabled={!newName.trim()}>
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
    </div>
  );
}
