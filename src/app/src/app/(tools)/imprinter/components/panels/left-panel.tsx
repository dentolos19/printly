"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServer } from "@/lib/providers/server";
import { Asset } from "@/lib/server/asset";
import { Design } from "@/lib/server/design";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImprinter } from "../hooks/use-imprinter";

type LeftPanelProps = {
  className?: string;
};

export function LeftPanel({ className }: LeftPanelProps) {
  const { leftPanelView, setLeftPanelView } = useImprinter();
  const [width, setWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      if (newWidth >= 200 && newWidth <= 500) {
        setWidth(newWidth);
      }
    },
    [isResizing],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!leftPanelView) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={cn("bg-background relative flex h-full flex-col border-r", className)}
      style={{ width }}
    >
      <PanelHeader view={leftPanelView} onClose={() => setLeftPanelView(null)} />
      <ScrollArea className="h-0 flex-1">
        {leftPanelView === "designs" && <DesignsPanel />}
        {leftPanelView === "assets" && <AssetsPanel />}
      </ScrollArea>
      <div
        className={cn(
          "hover:bg-primary absolute top-0 right-0 h-full w-1 cursor-ew-resize transition-colors",
          isResizing && "bg-primary",
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

// ============================================================================
// Panel Header
// ============================================================================

type PanelHeaderProps = {
  view: "designs" | "assets" | "templates";
  onClose: () => void;
};

function PanelHeader({ view, onClose }: PanelHeaderProps) {
  const titles = {
    designs: "Your Designs",
    assets: "Your Assets",
    templates: "Templates",
  };

  return (
    <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
      <span className="text-sm font-medium">{titles[view]}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Designs Panel
// ============================================================================

function DesignsPanel() {
  const { api } = useServer();
  const { addDesignToProduct } = useImprinter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.design
      .getDesigns()
      .then(setDesigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [api.design]);

  function handleDesignClick(design: Design) {
    addDesignToProduct(design, "front");
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground text-sm">No designs found</p>
        <p className="text-muted-foreground mt-1 text-xs">Create designs in the Designer first</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {designs.map((design) => (
        <button
          key={design.id}
          className="group bg-muted hover:border-primary relative aspect-square w-full overflow-hidden rounded-md border transition-colors"
          onClick={() => handleDesignClick(design)}
        >
          {design.coverId ? (
            <img src={`/assets/${design.coverId}/view`} alt={design.name} className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
              No preview
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-2">
            <p className="truncate text-xs font-medium text-white">{design.name}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Assets Panel
// ============================================================================

function AssetsPanel() {
  const { api } = useServer();
  const { addDesignToProduct } = useImprinter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.asset
      .getAssets()
      .then(setAssets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [api.asset]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const asset = await api.asset.uploadAsset(file);
        setAssets((prev) => [asset, ...prev]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleAssetClick(asset: Asset) {
    // Convert asset to a mock design to apply it
    const mockDesign: Design = {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      data: JSON.stringify({ version: "1.0", objects: [] }),
      coverId: asset.id,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
    addDesignToProduct(mockDesign, "front");
  }

  return (
    <Tabs defaultValue="library" className="h-full">
      <TabsList className="w-full rounded-none">
        <TabsTrigger value="library" className="flex-1">
          Library
        </TabsTrigger>
        <TabsTrigger value="upload" className="flex-1">
          Upload
        </TabsTrigger>
      </TabsList>

      <TabsContent value="library" className="mt-0 h-full">
        {loading ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <p className="text-muted-foreground text-sm">No assets found</p>
            <p className="text-muted-foreground mt-1 text-xs">Upload images to use them</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {assets.map((asset) => (
              <button
                key={asset.id}
                className="group bg-muted hover:border-primary relative aspect-square w-full overflow-hidden rounded-md border transition-colors"
                onClick={() => handleAssetClick(asset)}
              >
                <img src={`/assets/${asset.id}/view`} alt={asset.name} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-2">
                  <p className="truncate text-xs font-medium text-white">{asset.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="upload" className="mt-0 h-full">
        <div className="flex flex-col gap-3 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Choose Files
              </>
            )}
          </Button>
          <p className="text-muted-foreground text-xs">
            Upload images to use in your imprints. Supports PNG, JPG, and SVG.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
