"use client";

import { BLEND_MODES, BlendMode, LayerItem } from "@/app/designer/types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FabricObject } from "fabric";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  EyeOff,
  GripVertical,
  Image,
  Layers,
  Lock,
  Minus,
  Plus,
  Settings,
  Sliders,
  Square,
  Trash2,
  Triangle,
  Type,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDesigner } from "../hooks";

type RightPanelProps = {
  className?: string;
};

export function RightPanel({ className }: RightPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
  const [width, setWidth] = useState(288); // 288px = w-72
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
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

  if (!isExpanded) {
    return (
      <div className={cn("bg-background flex w-12 flex-col border-l", className)}>
        <div className={"flex flex-col items-center gap-2 py-2"}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type={"button"}
                variant={"ghost"}
                size={"icon"}
                className={"h-10 w-10"}
                onClick={() => setIsExpanded(true)}
              >
                <ChevronLeft className={"h-5 w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"left"}>Expand Properties</TooltipContent>
          </Tooltip>

          <Separator className={"my-1 w-8"} />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type={"button"}
                variant={"ghost"}
                size={"icon"}
                className={"h-10 w-10"}
                onClick={() => {
                  setIsExpanded(true);
                  setLayersOpen(true);
                }}
              >
                <Layers className={"h-5 w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"left"}>Layers</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type={"button"}
                variant={"ghost"}
                size={"icon"}
                className={"h-10 w-10"}
                onClick={() => {
                  setIsExpanded(true);
                  setPropertiesOpen(true);
                }}
              >
                <Settings className={"h-5 w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"left"}>Properties</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type={"button"}
                variant={"ghost"}
                size={"icon"}
                className={"h-10 w-10"}
                onClick={() => {
                  setIsExpanded(true);
                  setAdjustmentsOpen(true);
                }}
              >
                <Sliders className={"h-5 w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"left"}>Adjustments</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className={cn("bg-background relative flex flex-col border-l", className)} style={{ width }}>
      {/* Collapse button */}
      <div className={"flex items-center justify-between border-b px-3 py-2"}>
        <span className={"text-sm font-medium"}>Properties</span>
        <Button
          type={"button"}
          variant={"ghost"}
          size={"icon"}
          className={"h-7 w-7"}
          onClick={() => setIsExpanded(false)}
        >
          <ChevronRight className={"h-4 w-4"} />
        </Button>
      </div>

      <ScrollArea className={"flex-1"}>
        {/* Layers Section */}
        <Collapsible open={layersOpen} onOpenChange={setLayersOpen}>
          <CollapsibleTrigger className={"hover:bg-accent flex w-full items-center justify-between px-3 py-2"}>
            <div className={"flex items-center gap-2"}>
              <Layers className={"h-4 w-4"} />
              <span className={"text-sm font-medium"}>Layers</span>
            </div>
            {layersOpen ? <ChevronDown className={"h-4 w-4"} /> : <ChevronRight className={"h-4 w-4"} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <LayersSection />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Properties Section */}
        <Collapsible open={propertiesOpen} onOpenChange={setPropertiesOpen}>
          <CollapsibleTrigger className={"hover:bg-accent flex w-full items-center justify-between px-3 py-2"}>
            <span className={"text-sm font-medium"}>Properties</span>
            {propertiesOpen ? <ChevronDown className={"h-4 w-4"} /> : <ChevronRight className={"h-4 w-4"} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <PropertiesSection />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Adjustments Section */}
        <Collapsible open={adjustmentsOpen} onOpenChange={setAdjustmentsOpen}>
          <CollapsibleTrigger className={"hover:bg-accent flex w-full items-center justify-between px-3 py-2"}>
            <span className={"text-sm font-medium"}>Adjustments</span>
            {adjustmentsOpen ? <ChevronDown className={"h-4 w-4"} /> : <ChevronRight className={"h-4 w-4"} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <AdjustmentsSection />
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>

      {/* Resize handle */}
      <div
        className={cn(
          "hover:bg-primary absolute top-0 left-0 h-full w-1 cursor-ew-resize transition-colors",
          isResizing && "bg-primary",
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

// ============================================================================
// Layers Section
// ============================================================================

function LayersSection() {
  const { canvas, layers, selectedObjects, saveHistory, setLayers, deleteSelected } = useDesigner();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleLayerClick(layer: LayerItem) {
    if (!canvas || layer.locked) return;

    canvas.discardActiveObject();
    canvas.setActiveObject(layer.object);
    canvas.renderAll();
  }

  function handleVisibilityToggle(layer: LayerItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (!canvas) return;

    layer.object.set({ visible: !layer.visible });
    canvas.renderAll();
    saveHistory();
  }

  function handleLockToggle(layer: LayerItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (!canvas) return;

    const isLocked = !layer.locked;
    layer.object.set({
      selectable: !isLocked,
      evented: !isLocked,
    });

    if (isLocked && selectedObjects.includes(layer.object)) {
      canvas.discardActiveObject();
    }

    canvas.renderAll();
    saveHistory();
  }

  function isSelected(layer: LayerItem) {
    return selectedObjects.some((obj) => obj === layer.object);
  }

  function getLayerIcon(type: string) {
    switch (type) {
      case "textbox":
      case "text":
      case "i-text":
        return Type;
      case "rect":
        return Square;
      case "circle":
        return Circle;
      case "triangle":
        return Triangle;
      case "line":
        return Minus;
      case "image":
        return Image;
      case "group":
        return Layers;
      default:
        return Square;
    }
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, dropIndex: number) {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex || !canvas) {
      handleDragEnd();
      return;
    }

    const canvasObjects = canvas.getObjects();
    const totalObjects = canvasObjects.length;
    const fromCanvasIndex = totalObjects - 1 - draggedIndex;
    const toCanvasIndex = totalObjects - 1 - dropIndex;

    const draggedObject = canvasObjects[fromCanvasIndex];
    if (!draggedObject) {
      handleDragEnd();
      return;
    }

    canvas.remove(draggedObject);
    const objectsAfterRemoval = canvas.getObjects();
    const insertIndex = Math.min(toCanvasIndex, objectsAfterRemoval.length);
    canvas.insertAt(insertIndex, draggedObject);
    canvas.renderAll();

    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(draggedIndex, 1);
    newLayers.splice(dropIndex, 0, movedLayer);
    setLayers(newLayers);

    saveHistory();
    handleDragEnd();
  }

  if (layers.length === 0) {
    return (
      <div className={"flex flex-col items-center justify-center py-8 text-center"}>
        <Layers className={"text-muted-foreground/50 h-10 w-10"} />
        <p className={"text-muted-foreground mt-2 text-sm"}>No layers yet</p>
        <p className={"text-muted-foreground text-xs"}>Add elements to see them here</p>
      </div>
    );
  }

  return (
    <div className={"flex flex-col"}>
      {/* Add/Delete buttons */}
      <div className={"flex items-center gap-1 px-3 py-1"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"icon"} className={"h-7 w-7"}>
              <Plus className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Layer</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type={"button"}
              variant={"ghost"}
              size={"icon"}
              className={"h-7 w-7"}
              onClick={deleteSelected}
              disabled={selectedObjects.length === 0}
            >
              <Trash2 className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Selected</TooltipContent>
        </Tooltip>
      </div>

      {/* Layer list */}
      <div className={"flex flex-col"}>
        {layers.map((layer, index) => {
          const Icon = getLayerIcon(layer.type);
          const selected = isSelected(layer);

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, index)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 px-3 py-1.5",
                "hover:bg-accent transition-colors",
                selected && "bg-accent",
                dragOverIndex === index && "border-primary border-t-2",
                draggedIndex === index && "opacity-50",
              )}
              onClick={() => handleLayerClick(layer)}
            >
              <GripVertical className={"text-muted-foreground h-3 w-3 cursor-grab opacity-0 group-hover:opacity-100"} />

              {/* Visibility toggle */}
              <button
                type={"button"}
                className={"hover:bg-muted rounded p-0.5"}
                onClick={(e) => handleVisibilityToggle(layer, e)}
              >
                {layer.visible ? (
                  <Eye className={"text-muted-foreground h-3.5 w-3.5"} />
                ) : (
                  <EyeOff className={"text-muted-foreground h-3.5 w-3.5"} />
                )}
              </button>

              {/* Layer icon and name */}
              <Icon className={"text-muted-foreground h-4 w-4"} />
              <span className={cn("flex-1 truncate text-sm", !layer.visible && "text-muted-foreground")}>
                {layer.name}
              </span>

              {/* Lock toggle */}
              <button
                type={"button"}
                className={"hover:bg-muted rounded p-0.5 opacity-0 group-hover:opacity-100"}
                onClick={(e) => handleLockToggle(layer, e)}
              >
                {layer.locked ? (
                  <Lock className={"text-muted-foreground h-3.5 w-3.5"} />
                ) : (
                  <Unlock className={"text-muted-foreground h-3.5 w-3.5"} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Properties Section
// ============================================================================

type ObjectProperties = {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  blendMode: BlendMode;
};

function PropertiesSection() {
  const { canvas, selectedObjects, saveHistory } = useDesigner();
  const [properties, setProperties] = useState<ObjectProperties | null>(null);

  const selectedObject = selectedObjects[0] as FabricObject | undefined;

  useEffect(() => {
    if (!selectedObject) {
      setProperties(null);
      return;
    }

    const obj = selectedObject;

    setProperties({
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      opacity: Math.round((obj.opacity || 1) * 100),
      blendMode: (obj.globalCompositeOperation as BlendMode) || "normal",
    });
  }, [selectedObject]);

  function updateObject(key: string, value: unknown) {
    if (!canvas || !selectedObject) return;

    if (key === "width") {
      const originalWidth = selectedObject.width || 1;
      selectedObject.set({ scaleX: (value as number) / originalWidth });
    } else if (key === "height") {
      const originalHeight = selectedObject.height || 1;
      selectedObject.set({ scaleY: (value as number) / originalHeight });
    } else if (key === "opacity") {
      selectedObject.set({ opacity: (value as number) / 100 });
    } else if (key === "blendMode") {
      selectedObject.set({ globalCompositeOperation: value as string });
    } else {
      selectedObject.set({ [key]: value });
    }

    selectedObject.setCoords();
    canvas.renderAll();
  }

  function handlePropertyChange(key: string, value: unknown) {
    updateObject(key, value);
    setProperties((prev) => (prev ? { ...prev, [key]: value } : null));
  }

  function handlePropertyBlur() {
    saveHistory();
  }

  if (!selectedObject || !properties) {
    return (
      <div className={"flex flex-col items-center justify-center py-8 text-center"}>
        <Square className={"text-muted-foreground/50 h-10 w-10"} />
        <p className={"text-muted-foreground mt-2 text-sm"}>No selection</p>
        <p className={"text-muted-foreground text-xs"}>Select an element to edit</p>
      </div>
    );
  }

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      {/* Opacity */}
      <div className={"flex flex-col gap-2"}>
        <div className={"flex items-center justify-between"}>
          <Label className={"text-muted-foreground text-xs tracking-wide uppercase"}>Opacity</Label>
          <span className={"text-muted-foreground text-xs"}>{properties.opacity}%</span>
        </div>
        <Slider
          value={[properties.opacity]}
          onValueChange={([value]) => handlePropertyChange("opacity", value)}
          onValueCommit={handlePropertyBlur}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Blend Mode */}
      <div className={"flex flex-col gap-2"}>
        <Label className={"text-muted-foreground text-xs tracking-wide uppercase"}>Blend Mode</Label>
        <Select
          value={properties.blendMode}
          onValueChange={(value) => {
            handlePropertyChange("blendMode", value);
            saveHistory();
          }}
        >
          <SelectTrigger className={"h-8"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLEND_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Position */}
      <div className={"grid grid-cols-2 gap-2"}>
        <div className={"flex flex-col gap-1"}>
          <Label className={"text-muted-foreground text-xs tracking-wide uppercase"}>X</Label>
          <Input
            type={"number"}
            value={properties.left}
            onChange={(e) => handlePropertyChange("left", parseInt(e.target.value, 10) || 0)}
            onBlur={handlePropertyBlur}
            className={"h-8"}
          />
        </div>
        <div className={"flex flex-col gap-1"}>
          <Label className={"text-muted-foreground text-xs tracking-wide uppercase"}>Y</Label>
          <Input
            type={"number"}
            value={properties.top}
            onChange={(e) => handlePropertyChange("top", parseInt(e.target.value, 10) || 0)}
            onBlur={handlePropertyBlur}
            className={"h-8"}
          />
        </div>
      </div>

      {/* Size */}
      <div className={"grid grid-cols-2 gap-2"}>
        <div className={"flex flex-col gap-1"}>
          <Label className={"text-muted-foreground text-xs tracking-wide uppercase"}>Width</Label>
          <Input
            type={"number"}
            value={properties.width}
            onChange={(e) => handlePropertyChange("width", parseInt(e.target.value, 10) || 1)}
            onBlur={handlePropertyBlur}
            className={"h-8"}
          />
        </div>
        <div className={"flex flex-col gap-1"}>
          <Label className={"text-muted-foreground text-xs tracking-wide uppercase"}>Height</Label>
          <Input
            type={"number"}
            value={properties.height}
            onChange={(e) => handlePropertyChange("height", parseInt(e.target.value, 10) || 1)}
            onBlur={handlePropertyBlur}
            className={"h-8"}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Adjustments Section
// ============================================================================

function AdjustmentsSection() {
  const { selectedObjects } = useDesigner();
  const selectedObject = selectedObjects[0];

  if (!selectedObject) {
    return (
      <div className={"flex flex-col items-center justify-center py-8 text-center"}>
        <AlertTriangle className={"text-muted-foreground/50 h-10 w-10"} />
        <p className={"text-muted-foreground mt-2 text-sm"}>No selection</p>
        <p className={"text-muted-foreground text-xs"}>Select an image to adjust</p>
      </div>
    );
  }

  // Only show adjustments for images
  if (selectedObject.type !== "image") {
    return (
      <div className={"flex flex-col items-center justify-center py-8 text-center"}>
        <Image className={"text-muted-foreground/50 h-10 w-10"} />
        <p className={"text-muted-foreground mt-2 text-sm"}>Image adjustments only</p>
        <p className={"text-muted-foreground text-xs"}>Select an image to see adjustments</p>
      </div>
    );
  }

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      <p className={"text-muted-foreground text-sm"}>Image adjustments coming soon...</p>
    </div>
  );
}
