"use client";

import { useDesigner } from "@/app/designer/components/hooks";
import { ART_STYLES, ArtStyle, ToolType } from "@/app/designer/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import { Asset } from "@/lib/server/asset";
import { cn } from "@/lib/utils";
import { ChevronLeft, Image as ImageIcon, Loader2, Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type LeftPanelProps = {
  className?: string;
};

export function LeftPanel({ className }: LeftPanelProps) {
  const { activeTool, setActiveTool } = useDesigner();
  const [width, setWidth] = useState(256); // 256px = w-64
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Determine which panel to show based on active tool
  const showPanel = ["ai-generator", "shapes", "stickers", "assets"].includes(activeTool);

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

  if (!showPanel) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={cn("bg-background relative flex h-full flex-col border-r", className)}
      style={{ width }}
    >
      <PanelHeader tool={activeTool} onClose={() => setActiveTool("select")} />
      <ScrollArea className={"h-0 flex-1"}>
        {activeTool === "ai-generator" && <AIGeneratorPanel />}
        {activeTool === "shapes" && <ShapesPanel />}
        {activeTool === "stickers" && <StickersPanel />}
        {activeTool === "assets" && <AssetsPanel />}
      </ScrollArea>
      {/* Resize handle */}
      <div
        className={cn(
          "hover:bg-primary absolute top-0 right-0 h-full w-1 cursor-ew-resize transition-colors",
          isResizing && "bg-primary",
        )}
        onMouseDown={handleMouseDown}
      />{" "}
    </div>
  );
}

// ============================================================================
// Panel Header
// ============================================================================

type PanelHeaderProps = {
  tool: ToolType;
  onClose: () => void;
};

function PanelHeader({ tool, onClose }: PanelHeaderProps) {
  const titles: Record<string, string> = {
    "ai-generator": "AI Generator",
    shapes: "Shapes",
    stickers: "Stickers",
    assets: "Assets",
  };

  return (
    <div className={"flex shrink-0 items-center justify-between border-b px-3 py-2"}>
      <span className={"text-sm font-medium"}>{titles[tool] || "Panel"}</span>
      <Button type={"button"} variant={"ghost"} size={"icon"} className={"h-7 w-7"} onClick={onClose}>
        <ChevronLeft className={"h-4 w-4"} />
      </Button>
    </div>
  );
}

// ============================================================================
// AI Generator Panel
// ============================================================================

function AIGeneratorPanel() {
  const { generatedImages, isGenerating, generateImage, addImage } = useDesigner();
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle | undefined>(undefined);

  function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    generateImage(prompt.trim(), selectedStyle);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  function handleImageClick(url: string) {
    addImage(url);
  }

  function handleStyleClick(style: ArtStyle) {
    setSelectedStyle(selectedStyle === style ? undefined : style);
  }

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      {/* Art Style Selection */}
      <div className={"flex flex-col gap-2"}>
        <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>Art Style</Label>
        <div className={"grid grid-cols-2 gap-1.5"}>
          {ART_STYLES.map((style) => (
            <Button
              key={style.value}
              type={"button"}
              variant={selectedStyle === style.value ? "default" : "outline"}
              size={"sm"}
              className={cn(
                "h-auto flex-col gap-0.5 py-2 text-xs",
                selectedStyle === style.value && "ring-2 ring-offset-1",
              )}
              onClick={() => handleStyleClick(style.value)}
              disabled={isGenerating}
            >
              <span className={"font-medium"}>{style.label}</span>
            </Button>
          ))}
        </div>
        {selectedStyle && (
          <p className={"text-muted-foreground text-xs"}>
            {ART_STYLES.find((s) => s.value === selectedStyle)?.description}
          </p>
        )}
      </div>

      {/* Prompt input */}
      <div className={"flex flex-col gap-2"}>
        <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>Prompt</Label>
        <Textarea
          placeholder={"Describe your design..."}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          className={"min-h-20 resize-none"}
          disabled={isGenerating}
        />
        <Button
          type={"button"}
          className={"w-full gap-2"}
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? <Loader2 className={"h-4 w-4 animate-spin"} /> : <Sparkles className={"h-4 w-4"} />}
          Generate {selectedStyle ? `(${ART_STYLES.find((s) => s.value === selectedStyle)?.label})` : ""}
        </Button>
      </div>

      {/* Generated results */}
      <div className={"flex flex-col gap-2"}>
        <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>Generated Results</Label>

        {isGenerating && (
          <div className={"grid grid-cols-2 gap-2"}>
            <Skeleton className={"aspect-square rounded-lg"} />
            <Skeleton className={"aspect-square rounded-lg"} />
          </div>
        )}

        {generatedImages.length > 0 && (
          <div className={"grid grid-cols-2 gap-2"}>
            {generatedImages.map((image) => (
              <button
                key={image.id}
                type={"button"}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border",
                  "hover:ring-primary focus:ring-primary hover:ring-2 focus:ring-2 focus:outline-none",
                )}
                onClick={() => handleImageClick(image.url)}
              >
                <img
                  src={image.url}
                  alt={image.prompt}
                  className={"h-full w-full object-cover transition-transform group-hover:scale-105"}
                />
                <div
                  className={cn(
                    "absolute inset-0 flex items-end bg-linear-to-t from-black/60 to-transparent",
                    "opacity-0 transition-opacity group-hover:opacity-100",
                  )}
                >
                  <div className={"p-2"}>
                    {image.style && (
                      <span className={"mb-1 inline-block rounded bg-white/20 px-1.5 py-0.5 text-[10px] text-white"}>
                        {ART_STYLES.find((s) => s.value === image.style)?.label}
                      </span>
                    )}
                    <p className={"line-clamp-2 text-xs text-white"}>{image.prompt}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isGenerating && generatedImages.length === 0 && (
          <div className={"flex flex-col items-center justify-center py-8 text-center"}>
            <Sparkles className={"text-muted-foreground/50 h-10 w-10"} />
            <p className={"text-muted-foreground mt-2 text-sm"}>No images generated yet</p>
            <p className={"text-muted-foreground text-xs"}>Select a style and enter a prompt</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Shapes Panel
// ============================================================================

function ShapesPanel() {
  const { addRectangle, addCircle, addTriangle, addLine, setActiveTool } = useDesigner();

  const shapes = [
    {
      id: "rect",
      label: "Rectangle",
      onClick: () => {
        addRectangle();
        setActiveTool("select");
      },
    },
    {
      id: "circle",
      label: "Circle",
      onClick: () => {
        addCircle();
        setActiveTool("select");
      },
    },
    {
      id: "triangle",
      label: "Triangle",
      onClick: () => {
        addTriangle();
        setActiveTool("select");
      },
    },
    {
      id: "line",
      label: "Line",
      onClick: () => {
        addLine();
        setActiveTool("select");
      },
    },
  ];

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>Basic Shapes</Label>
      <div className={"grid grid-cols-2 gap-2"}>
        {shapes.map((shape) => (
          <Button
            key={shape.id}
            type={"button"}
            variant={"outline"}
            className={"aspect-square h-auto flex-col gap-2"}
            onClick={shape.onClick}
          >
            {shape.id === "rect" && <div className={"h-8 w-8 rounded-sm bg-blue-500"} />}
            {shape.id === "circle" && <div className={"h-8 w-8 rounded-full bg-green-500"} />}
            {shape.id === "triangle" && (
              <div
                className={
                  "h-0 w-0 border-r-4 border-b-8 border-l-4 border-r-transparent border-b-amber-500 border-l-transparent"
                }
              />
            )}
            {shape.id === "line" && <div className={"h-1 w-8 bg-gray-800"} />}
            <span className={"text-xs"}>{shape.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Stickers Panel
// ============================================================================

function StickersPanel() {
  const { addText, setActiveTool } = useDesigner();

  const stickers = [
    { id: "star", emoji: "⭐" },
    { id: "heart", emoji: "❤️" },
    { id: "fire", emoji: "🔥" },
    { id: "thumbsup", emoji: "👍" },
    { id: "smile", emoji: "😊" },
    { id: "party", emoji: "🎉" },
    { id: "rocket", emoji: "🚀" },
    { id: "check", emoji: "✅" },
  ];

  function handleStickerClick(emoji: string) {
    addText(emoji);
    setActiveTool("select");
  }

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>Emoji Stickers</Label>
      <div className={"grid grid-cols-4 gap-2"}>
        {stickers.map((sticker) => (
          <Button
            key={sticker.id}
            type={"button"}
            variant={"outline"}
            className={"aspect-square h-12 w-12 text-2xl"}
            onClick={() => handleStickerClick(sticker.emoji)}
          >
            {sticker.emoji}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Assets Panel
// ============================================================================

function AssetsPanel() {
  const { addImage, setActiveTool } = useDesigner();
  const { api } = useServer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  function loadAssets() {
    setIsLoadingAssets(true);
    api.asset
      .getAssets()
      .then((data) => {
        const imageAssets = data.filter((asset) => asset.type.startsWith("image/"));
        setAssets(imageAssets);
      })
      .catch((error) => {
        console.error("Failed to load assets:", error);
      })
      .finally(() => {
        setIsLoadingAssets(false);
      });
  }

  useEffect(() => {
    loadAssets();
  }, [api.asset]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    api.asset
      .uploadAsset(file)
      .then((asset) => {
        const assetUrl = `/assets/${asset.id}/view`;
        addImage(assetUrl);
        setActiveTool("select");
        loadAssets();
      })
      .catch((error) => {
        console.error("Failed to upload asset:", error);
      })
      .finally(() => {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      });
  }

  function handleUrlSubmit() {
    if (!imageUrl.trim()) return;

    setIsUploading(true);
    globalThis
      .fetch(imageUrl.trim())
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch image from URL");
        }
        return response.blob();
      })
      .then((blob) => {
        const fileName = imageUrl.split("/").pop() || "image.png";
        const file = new File([blob], fileName, { type: blob.type });
        return api.asset.uploadAsset(file);
      })
      .then((asset) => {
        const assetUrl = `/assets/${asset.id}/view`;
        addImage(assetUrl);
        setImageUrl("");
        setActiveTool("select");
        loadAssets();
      })
      .catch((error) => {
        console.error("Failed to upload image from URL:", error);
      })
      .finally(() => {
        setIsUploading(false);
      });
  }

  function handleAssetClick(assetId: string) {
    const assetUrl = `/assets/${assetId}/view`;
    addImage(assetUrl);
    setActiveTool("select");
  }

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      <Tabs defaultValue={"library"} className={"w-full"}>
        <TabsList className={"grid w-full grid-cols-2"}>
          <TabsTrigger value={"library"}>Library</TabsTrigger>
          <TabsTrigger value={"upload"}>Upload</TabsTrigger>
        </TabsList>

        <TabsContent value={"library"} className={"mt-4"}>
          <div className={"flex flex-col gap-2"}>
            <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>Your Assets</Label>

            {isLoadingAssets && (
              <div className={"grid grid-cols-2 gap-2"}>
                <Skeleton className={"aspect-square rounded-lg"} />
                <Skeleton className={"aspect-square rounded-lg"} />
                <Skeleton className={"aspect-square rounded-lg"} />
                <Skeleton className={"aspect-square rounded-lg"} />
              </div>
            )}

            {!isLoadingAssets && assets.length > 0 && (
              <div className={"grid grid-cols-2 gap-2"}>
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type={"button"}
                    className={cn(
                      "group bg-muted relative aspect-square overflow-hidden rounded-lg border",
                      "hover:ring-primary focus:ring-primary hover:ring-2 focus:ring-2 focus:outline-none",
                    )}
                    onClick={() => handleAssetClick(asset.id)}
                  >
                    <img
                      src={`/assets/${asset.id}/view`}
                      alt={asset.name}
                      className={"h-full w-full object-cover transition-transform group-hover:scale-105"}
                    />
                    <div
                      className={cn(
                        "absolute inset-0 flex items-end bg-linear-to-t from-black/60 to-transparent",
                        "opacity-0 transition-opacity group-hover:opacity-100",
                      )}
                    >
                      <p className={"line-clamp-2 p-2 text-xs text-white"}>{asset.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isLoadingAssets && assets.length === 0 && (
              <div className={"flex flex-col items-center justify-center py-8 text-center"}>
                <ImageIcon className={"text-muted-foreground/50 h-10 w-10"} />
                <p className={"text-muted-foreground mt-2 text-sm"}>No images in library</p>
                <p className={"text-muted-foreground text-xs"}>Upload images to see them here</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value={"upload"} className={"mt-4"}>
          <div className={"flex flex-col gap-4"}>
            {/* Upload from file */}
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>
                Upload Image
              </Label>
              <input
                ref={fileInputRef}
                type={"file"}
                accept={"image/*"}
                onChange={handleFileSelect}
                className={"hidden"}
                disabled={isUploading}
              />
              <Button
                type={"button"}
                variant={"outline"}
                className={"w-full gap-2"}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className={"h-4 w-4 animate-spin"} /> : <Upload className={"h-4 w-4"} />}
                {isUploading ? "Uploading..." : "Choose File"}
              </Button>
            </div>

            {/* Add from URL */}
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs font-medium tracking-wide uppercase"}>From URL</Label>
              <div className={"flex gap-2"}>
                <Input
                  type={"url"}
                  placeholder={"https://..."}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isUploading) {
                      handleUrlSubmit();
                    }
                  }}
                  disabled={isUploading}
                />
                <Button
                  type={"button"}
                  size={"icon"}
                  onClick={handleUrlSubmit}
                  disabled={!imageUrl.trim() || isUploading}
                >
                  {isUploading ? <Loader2 className={"h-4 w-4 animate-spin"} /> : <Upload className={"h-4 w-4"} />}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
