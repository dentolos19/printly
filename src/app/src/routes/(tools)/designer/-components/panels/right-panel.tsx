"use client";

import type { FabricObject } from "fabric";
import {
  AlertTriangle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  GripVertical,
  Image,
  Italic,
  Layers,
  Lock,
  Minus,
  PenSquare,
  RotateCcw,
  Settings,
  Sliders,
  Square,
  Strikethrough,
  Trash2,
  Triangle,
  Type,
  Underline,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Slider } from "#/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { BLEND_MODES, type BlendMode, type LayerItem } from "#/routes/(tools)/designer/-types";
import { ColorPicker } from "../color-picker";
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
      <div className={cn("flex w-12 flex-col border-l bg-background", className)}>
        <div className={"flex flex-col items-center gap-2 py-2"}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={"h-10 w-10"}
                onClick={() => setIsExpanded(true)}
                size={"icon"}
                type={"button"}
                variant={"ghost"}
              >
                <ChevronLeft className={"h-5 w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"left"}>Expand Panel</TooltipContent>
          </Tooltip>

          <Separator className={"my-1 w-8"} />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={"h-10 w-10"}
                onClick={() => {
                  setIsExpanded(true);
                  setLayersOpen(true);
                }}
                size={"icon"}
                type={"button"}
                variant={"ghost"}
              >
                <Layers className={"h-5 w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"left"}>Layers</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={"h-10 w-10"}
                onClick={() => {
                  setIsExpanded(true);
                  setPropertiesOpen(true);
                }}
                size={"icon"}
                type={"button"}
                variant={"ghost"}
              >
                <Settings className={"h-5 w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"left"}>Properties</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={"h-10 w-10"}
                onClick={() => {
                  setIsExpanded(true);
                  setAdjustmentsOpen(true);
                }}
                size={"icon"}
                type={"button"}
                variant={"ghost"}
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
    <div
      className={cn("relative flex h-full flex-col border-l bg-background", className)}
      ref={panelRef}
      style={{ width }}
    >
      {/* Collapse button */}
      <div className={"flex shrink-0 items-center justify-between border-b px-3 py-2"}>
        <span className={"font-medium text-sm"}>Manage</span>
        <Button
          className={"h-7 w-7"}
          onClick={() => setIsExpanded(false)}
          size={"icon"}
          type={"button"}
          variant={"ghost"}
        >
          <ChevronRight className={"h-4 w-4"} />
        </Button>
      </div>

      <ScrollArea className={"h-0 flex-1"}>
        {/* Layers Section */}
        <Collapsible onOpenChange={setLayersOpen} open={layersOpen}>
          <CollapsibleTrigger className={"flex w-full items-center justify-between px-3 py-2 hover:bg-accent"}>
            <div className={"flex items-center gap-2"}>
              <Layers className={"h-4 w-4"} />
              <span className={"font-medium text-sm"}>Layers</span>
            </div>
            {layersOpen ? <ChevronDown className={"h-4 w-4"} /> : <ChevronRight className={"h-4 w-4"} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <LayersSection />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Properties Section */}
        <Collapsible onOpenChange={setPropertiesOpen} open={propertiesOpen}>
          <CollapsibleTrigger className={"flex w-full items-center justify-between px-3 py-2 hover:bg-accent"}>
            <span className={"font-medium text-sm"}>Properties</span>
            {propertiesOpen ? <ChevronDown className={"h-4 w-4"} /> : <ChevronRight className={"h-4 w-4"} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <PropertiesSection />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Adjustments Section */}
        <Collapsible onOpenChange={setAdjustmentsOpen} open={adjustmentsOpen}>
          <CollapsibleTrigger className={"flex w-full items-center justify-between px-3 py-2 hover:bg-accent"}>
            <span className={"font-medium text-sm"}>Adjustments</span>
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
          "absolute top-0 left-0 h-full w-1 cursor-ew-resize transition-colors hover:bg-primary",
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
  const { canvas, layers, selectedObjects, saveHistory, setLayers, renameLayer, deleteSelected } = useDesigner();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function startRenaming(layer: LayerItem) {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  }

  function commitRenaming(layer: LayerItem) {
    const trimmedName = editingName.trim();
    if (trimmedName && trimmedName !== layer.name) {
      renameLayer(layer.id, trimmedName);
    }
    setEditingLayerId(null);
    setEditingName("");
  }

  function cancelRenaming() {
    setEditingLayerId(null);
    setEditingName("");
  }

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

  const selectedLayer = layers.find((layer) => selectedObjects.includes(layer.object));

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
        <Layers className={"h-10 w-10 text-muted-foreground/50"} />
        <p className={"mt-2 text-muted-foreground text-sm"}>No layers yet</p>
        <p className={"text-muted-foreground text-xs"}>Add elements to see them here</p>
      </div>
    );
  }

  return (
    <div className={"flex flex-col"}>
      {/* Rename/Delete buttons */}
      <div className={"flex items-center gap-1 px-3 py-1"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={"h-7 w-7"}
              disabled={!selectedLayer}
              onClick={() => selectedLayer && startRenaming(selectedLayer)}
              size={"icon"}
              type={"button"}
              variant={"ghost"}
            >
              <PenSquare className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rename Selected</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={"h-7 w-7"}
              disabled={selectedObjects.length === 0}
              onClick={deleteSelected}
              size={"icon"}
              type={"button"}
              variant={"ghost"}
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
              className={cn(
                "group flex cursor-pointer items-center gap-2 px-3 py-1.5",
                "transition-colors hover:bg-accent",
                selected && "bg-accent",
                dragOverIndex === index && "border-primary border-t-2",
                draggedIndex === index && "opacity-50",
              )}
              draggable
              key={layer.id}
              onClick={() => handleLayerClick(layer)}
              onDragEnd={handleDragEnd}
              onDragLeave={() => setDragOverIndex(null)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <GripVertical className={"h-3 w-3 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"} />

              {/* Visibility toggle */}
              <button
                className={"rounded p-0.5 hover:bg-muted"}
                onClick={(e) => handleVisibilityToggle(layer, e)}
                type={"button"}
              >
                {layer.visible ? (
                  <Eye className={"h-3.5 w-3.5 text-muted-foreground"} />
                ) : (
                  <EyeOff className={"h-3.5 w-3.5 text-muted-foreground"} />
                )}
              </button>

              {/* Layer icon and name */}
              <Icon className={"h-4 w-4 text-muted-foreground"} />
              {editingLayerId === layer.id ? (
                <Input
                  autoFocus
                  className={"h-7 flex-1 text-xs"}
                  onBlur={() => commitRenaming(layer)}
                  onChange={(e) => setEditingName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      commitRenaming(layer);
                    }
                    if (e.key === "Escape") {
                      cancelRenaming();
                    }
                  }}
                  value={editingName}
                />
              ) : (
                <span
                  className={cn("flex-1 truncate text-sm", !layer.visible && "text-muted-foreground")}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRenaming(layer);
                  }}
                  title={"Double-click to rename"}
                >
                  {layer.name}
                </span>
              )}

              {/* Lock toggle */}
              <button
                className={"rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"}
                onClick={(e) => handleLockToggle(layer, e)}
                type={"button"}
              >
                {layer.locked ? (
                  <Lock className={"h-3.5 w-3.5 text-muted-foreground"} />
                ) : (
                  <Unlock className={"h-3.5 w-3.5 text-muted-foreground"} />
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
  rotation: number;
  blendMode: BlendMode;
  flipX: boolean;
  flipY: boolean;
  // Text properties
  fill?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  textAlign?: string;
  lineHeight?: number;
  charSpacing?: number;
  fontStyle?: string;
  underline?: boolean;
  linethrough?: boolean;
  // Shape properties
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  rx?: number;
  ry?: number;
  // Shadow properties
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

const FONT_FAMILIES = [
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Comic Sans MS",
  "Impact",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Playfair Display",
  "Merriweather",
];

const FONT_WEIGHTS = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

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
    const baseProps: ObjectProperties = {
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      opacity: Math.round((obj.opacity || 1) * 100),
      rotation: Math.round(obj.angle || 0),
      blendMode:
        !obj.globalCompositeOperation || obj.globalCompositeOperation === "source-over"
          ? "normal"
          : (obj.globalCompositeOperation as BlendMode),
      flipX: obj.flipX || false,
      flipY: obj.flipY || false,
    };

    // Add text-specific properties
    if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
      const textObj = obj as unknown as Record<string, unknown>;
      baseProps.fill = (obj.fill as string) || "#000000";
      baseProps.fontFamily = (textObj.fontFamily as string) || "Inter";
      baseProps.fontSize = (textObj.fontSize as number) || 48;
      baseProps.fontWeight = (textObj.fontWeight as string | number) || "400";
      baseProps.textAlign = (textObj.textAlign as string) || "left";
      baseProps.lineHeight = (textObj.lineHeight as number) || 1.16;
      baseProps.charSpacing = (textObj.charSpacing as number) || 0;
      baseProps.fontStyle = (textObj.fontStyle as string) || "normal";
      baseProps.underline = (textObj.underline as boolean) || false;
      baseProps.linethrough = (textObj.linethrough as boolean) || false;
    }

    // Add shape-specific properties
    if (obj.type === "rect" || obj.type === "circle" || obj.type === "triangle" || obj.type === "polygon") {
      baseProps.fill = (obj.fill as string) || "#3b82f6";
      baseProps.stroke = (obj.stroke as string) || "#1d4ed8";
      baseProps.strokeWidth = (obj.strokeWidth as number) || 2;
      baseProps.strokeDashArray = (obj.strokeDashArray as number[]) || [];
      if (obj.type === "rect") {
        const rectObj = obj as unknown as Record<string, unknown>;
        baseProps.rx = (rectObj.rx as number) || 0;
        baseProps.ry = (rectObj.ry as number) || 0;
      }
    }

    // Add line-specific properties
    if (obj.type === "line") {
      baseProps.stroke = (obj.stroke as string) || "#000000";
      baseProps.strokeWidth = (obj.strokeWidth as number) || 4;
      baseProps.strokeDashArray = (obj.strokeDashArray as number[]) || [];
    }

    // Add shadow properties for all types
    baseProps.shadowColor = (obj.shadow as { color?: string })?.color || "#000000";
    baseProps.shadowBlur = (obj.shadow as { blur?: number })?.blur || 0;
    baseProps.shadowOffsetX = (obj.shadow as { offsetX?: number })?.offsetX || 0;
    baseProps.shadowOffsetY = (obj.shadow as { offsetY?: number })?.offsetY || 0;

    setProperties(baseProps);
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
      selectedObject.set({
        globalCompositeOperation: value === "normal" ? "source-over" : (value as string),
      });
    } else if (key === "rotation") {
      selectedObject.set({ angle: value as number });
    } else if (key.startsWith("shadow")) {
      const shadow =
        (selectedObject.shadow as { color?: string; blur?: number; offsetX?: number; offsetY?: number }) || {};
      if (key === "shadowColor") shadow.color = value as string;
      else if (key === "shadowBlur") shadow.blur = value as number;
      else if (key === "shadowOffsetX") shadow.offsetX = value as number;
      else if (key === "shadowOffsetY") shadow.offsetY = value as number;
      selectedObject.set({ shadow: shadow });
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

  function handleFlip(direction: "horizontal" | "vertical") {
    if (!selectedObject) return;
    const key = direction === "horizontal" ? "flipX" : "flipY";
    const currentValue = selectedObject[key as keyof FabricObject] as boolean;
    handlePropertyChange(key, !currentValue);
    saveHistory();
  }

  function handleStrokeDashChange(value: string) {
    const dashArray = value === "solid" ? [] : value === "dashed" ? [10, 5] : [2, 2];
    handlePropertyChange("strokeDashArray", dashArray);
    saveHistory();
  }

  if (!selectedObject || !properties) {
    return (
      <div className={"flex flex-col items-center justify-center py-8 text-center"}>
        <Square className={"h-10 w-10 text-muted-foreground/50"} />
        <p className={"mt-2 text-muted-foreground text-sm"}>No selection</p>
        <p className={"text-muted-foreground text-xs"}>Select an element to edit</p>
      </div>
    );
  }

  const isText =
    selectedObject.type === "text" || selectedObject.type === "i-text" || selectedObject.type === "textbox";
  const isShape =
    selectedObject.type === "rect" ||
    selectedObject.type === "circle" ||
    selectedObject.type === "triangle" ||
    selectedObject.type === "polygon";
  const isLine = selectedObject.type === "line";
  const isRect = selectedObject.type === "rect";

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      {/* General Properties */}
      <div className={"flex flex-col gap-4"}>
        <Label className={"font-semibold text-muted-foreground text-xs uppercase tracking-wide"}>General</Label>

        {/* Position */}
        <div className={"grid grid-cols-2 gap-2"}>
          <div className={"flex flex-col gap-1"}>
            <Label className={"text-muted-foreground text-xs"}>X</Label>
            <Input
              className={"h-8"}
              onBlur={handlePropertyBlur}
              onChange={(e) => handlePropertyChange("left", parseInt(e.target.value, 10) || 0)}
              type={"number"}
              value={properties.left}
            />
          </div>
          <div className={"flex flex-col gap-1"}>
            <Label className={"text-muted-foreground text-xs"}>Y</Label>
            <Input
              className={"h-8"}
              onBlur={handlePropertyBlur}
              onChange={(e) => handlePropertyChange("top", parseInt(e.target.value, 10) || 0)}
              type={"number"}
              value={properties.top}
            />
          </div>
        </div>

        {/* Size */}
        <div className={"grid grid-cols-2 gap-2"}>
          <div className={"flex flex-col gap-1"}>
            <Label className={"text-muted-foreground text-xs"}>Width</Label>
            <Input
              className={"h-8"}
              onBlur={handlePropertyBlur}
              onChange={(e) => handlePropertyChange("width", parseInt(e.target.value, 10) || 1)}
              type={"number"}
              value={properties.width}
            />
          </div>
          <div className={"flex flex-col gap-1"}>
            <Label className={"text-muted-foreground text-xs"}>Height</Label>
            <Input
              className={"h-8"}
              onBlur={handlePropertyBlur}
              onChange={(e) => handlePropertyChange("height", parseInt(e.target.value, 10) || 1)}
              type={"number"}
              value={properties.height}
            />
          </div>
        </div>

        {/* Rotation */}
        <div className={"flex flex-col gap-2"}>
          <div className={"flex items-center justify-between"}>
            <Label className={"text-muted-foreground text-xs"}>Rotation</Label>
            <span className={"text-muted-foreground text-xs"}>{properties.rotation}°</span>
          </div>
          <Slider
            max={180}
            min={-180}
            onValueChange={([value]) => handlePropertyChange("rotation", value)}
            onValueCommit={handlePropertyBlur}
            step={1}
            value={[properties.rotation]}
          />
        </div>

        {/* Flip */}
        <div className={"flex items-center gap-2"}>
          <Button
            className={"h-8 flex-1"}
            onClick={() => handleFlip("horizontal")}
            size={"sm"}
            type={"button"}
            variant={"outline"}
          >
            <FlipHorizontal className={"mr-1.5 h-3.5 w-3.5"} />
            Flip H
          </Button>
          <Button
            className={"h-8 flex-1"}
            onClick={() => handleFlip("vertical")}
            size={"sm"}
            type={"button"}
            variant={"outline"}
          >
            <FlipVertical className={"mr-1.5 h-3.5 w-3.5"} />
            Flip V
          </Button>
        </div>

        {/* Opacity */}
        <div className={"flex flex-col gap-2"}>
          <div className={"flex items-center justify-between"}>
            <Label className={"text-muted-foreground text-xs"}>Opacity</Label>
            <span className={"text-muted-foreground text-xs"}>{properties.opacity}%</span>
          </div>
          <Slider
            max={100}
            min={0}
            onValueChange={([value]) => handlePropertyChange("opacity", value)}
            onValueCommit={handlePropertyBlur}
            step={1}
            value={[properties.opacity]}
          />
        </div>

        {/* Blend Mode */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-muted-foreground text-xs"}>Blend Mode</Label>
          <Select
            onValueChange={(value) => {
              handlePropertyChange("blendMode", value);
              saveHistory();
            }}
            value={properties.blendMode}
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
      </div>

      {/* Text Properties */}
      {isText && (
        <>
          <Separator />
          <div className={"flex flex-col gap-4"}>
            <Label className={"font-semibold text-muted-foreground text-xs uppercase tracking-wide"}>Typography</Label>

            {/* Text Color */}
            <ColorPicker
              color={properties.fill || "#000000"}
              label={"Color"}
              onChange={(color) => handlePropertyChange("fill", color)}
            />

            {/* Font Family */}
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs"}>Font Family</Label>
              <Select
                onValueChange={(value) => {
                  handlePropertyChange("fontFamily", value);
                  saveHistory();
                }}
                value={properties.fontFamily}
              >
                <SelectTrigger className={"h-8"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className={"flex flex-col gap-2"}>
              <div className={"flex items-center justify-between"}>
                <Label className={"text-muted-foreground text-xs"}>Font Size</Label>
                <span className={"text-muted-foreground text-xs"}>{properties.fontSize}px</span>
              </div>
              <Slider
                max={200}
                min={8}
                onValueChange={([value]) => handlePropertyChange("fontSize", value)}
                onValueCommit={handlePropertyBlur}
                step={1}
                value={[properties.fontSize || 48]}
              />
            </div>

            {/* Font Weight */}
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs"}>Font Weight</Label>
              <Select
                onValueChange={(value) => {
                  handlePropertyChange("fontWeight", value);
                  saveHistory();
                }}
                value={String(properties.fontWeight)}
              >
                <SelectTrigger className={"h-8"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text Alignment */}
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs"}>Alignment</Label>
              <ToggleGroup
                className={"justify-start"}
                onValueChange={(value) => {
                  if (value) {
                    handlePropertyChange("textAlign", value);
                    saveHistory();
                  }
                }}
                type={"single"}
                value={properties.textAlign}
              >
                <ToggleGroupItem aria-label={"Align left"} className={"h-8 w-10"} value={"left"}>
                  <AlignLeft className={"h-3.5 w-3.5"} />
                </ToggleGroupItem>
                <ToggleGroupItem aria-label={"Align center"} className={"h-8 w-10"} value={"center"}>
                  <AlignCenter className={"h-3.5 w-3.5"} />
                </ToggleGroupItem>
                <ToggleGroupItem aria-label={"Align right"} className={"h-8 w-10"} value={"right"}>
                  <AlignRight className={"h-3.5 w-3.5"} />
                </ToggleGroupItem>
                <ToggleGroupItem aria-label={"Align justify"} className={"h-8 w-10"} value={"justify"}>
                  <AlignJustify className={"h-3.5 w-3.5"} />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Text Style */}
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs"}>Style</Label>
              <div className={"flex items-center gap-2"}>
                <Button
                  className={"h-8 flex-1"}
                  onClick={() => {
                    handlePropertyChange("fontStyle", properties.fontStyle === "italic" ? "normal" : "italic");
                    saveHistory();
                  }}
                  size={"sm"}
                  type={"button"}
                  variant={properties.fontStyle === "italic" ? "default" : "outline"}
                >
                  <Italic className={"h-3.5 w-3.5"} />
                </Button>
                <Button
                  className={"h-8 flex-1"}
                  onClick={() => {
                    handlePropertyChange("underline", !properties.underline);
                    saveHistory();
                  }}
                  size={"sm"}
                  type={"button"}
                  variant={properties.underline ? "default" : "outline"}
                >
                  <Underline className={"h-3.5 w-3.5"} />
                </Button>
                <Button
                  className={"h-8 flex-1"}
                  onClick={() => {
                    handlePropertyChange("linethrough", !properties.linethrough);
                    saveHistory();
                  }}
                  size={"sm"}
                  type={"button"}
                  variant={properties.linethrough ? "default" : "outline"}
                >
                  <Strikethrough className={"h-3.5 w-3.5"} />
                </Button>
              </div>
            </div>

            {/* Line Height */}
            <div className={"flex flex-col gap-2"}>
              <div className={"flex items-center justify-between"}>
                <Label className={"text-muted-foreground text-xs"}>Line Height</Label>
                <span className={"text-muted-foreground text-xs"}>{properties.lineHeight?.toFixed(2)}</span>
              </div>
              <Slider
                max={3}
                min={0.5}
                onValueChange={([value]) => handlePropertyChange("lineHeight", value)}
                onValueCommit={handlePropertyBlur}
                step={0.01}
                value={[properties.lineHeight || 1.16]}
              />
            </div>

            {/* Letter Spacing */}
            <div className={"flex flex-col gap-2"}>
              <div className={"flex items-center justify-between"}>
                <Label className={"text-muted-foreground text-xs"}>Letter Spacing</Label>
                <span className={"text-muted-foreground text-xs"}>{properties.charSpacing}</span>
              </div>
              <Slider
                max={800}
                min={-200}
                onValueChange={([value]) => handlePropertyChange("charSpacing", value)}
                onValueCommit={handlePropertyBlur}
                step={10}
                value={[properties.charSpacing || 0]}
              />
            </div>
          </div>
        </>
      )}

      {/* Shape Properties */}
      {(isShape || isLine) && (
        <>
          <Separator />
          <div className={"flex flex-col gap-4"}>
            <Label className={"font-semibold text-muted-foreground text-xs uppercase tracking-wide"}>
              {isLine ? "Line" : "Shape"}
            </Label>

            {/* Fill Color (not for lines) */}
            {!isLine && (
              <ColorPicker
                color={properties.fill || "#3b82f6"}
                label={"Fill"}
                onChange={(color) => handlePropertyChange("fill", color)}
              />
            )}

            {/* Stroke Color */}
            <ColorPicker
              color={properties.stroke || "#000000"}
              label={"Stroke"}
              onChange={(color) => handlePropertyChange("stroke", color)}
            />

            {/* Stroke Width */}
            <div className={"flex flex-col gap-2"}>
              <div className={"flex items-center justify-between"}>
                <Label className={"text-muted-foreground text-xs"}>Stroke Width</Label>
                <span className={"text-muted-foreground text-xs"}>{properties.strokeWidth}px</span>
              </div>
              <Slider
                max={20}
                min={0}
                onValueChange={([value]) => handlePropertyChange("strokeWidth", value)}
                onValueCommit={handlePropertyBlur}
                step={1}
                value={[properties.strokeWidth || 2]}
              />
            </div>

            {/* Stroke Style */}
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs"}>Stroke Style</Label>
              <Select
                onValueChange={handleStrokeDashChange}
                value={
                  !properties.strokeDashArray || properties.strokeDashArray.length === 0
                    ? "solid"
                    : properties.strokeDashArray[0] === 10
                      ? "dashed"
                      : "dotted"
                }
              >
                <SelectTrigger className={"h-8"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"solid"}>Solid</SelectItem>
                  <SelectItem value={"dashed"}>Dashed</SelectItem>
                  <SelectItem value={"dotted"}>Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Corner Radius (rectangles only) */}
            {isRect && (
              <div className={"flex flex-col gap-2"}>
                <div className={"flex items-center justify-between"}>
                  <Label className={"text-muted-foreground text-xs"}>Corner Radius</Label>
                  <span className={"text-muted-foreground text-xs"}>{properties.rx}px</span>
                </div>
                <Slider
                  max={100}
                  min={0}
                  onValueChange={([value]) => {
                    handlePropertyChange("rx", value);
                    handlePropertyChange("ry", value);
                  }}
                  onValueCommit={handlePropertyBlur}
                  step={1}
                  value={[properties.rx || 0]}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Shadow Effects */}
      <Separator />
      <div className={"flex flex-col gap-4"}>
        <Label className={"font-semibold text-muted-foreground text-xs uppercase tracking-wide"}>Shadow</Label>

        {/* Shadow Color */}
        <ColorPicker
          color={properties.shadowColor || "#000000"}
          label={"Color"}
          onChange={(color) => handlePropertyChange("shadowColor", color)}
        />

        {/* Shadow Blur */}
        <div className={"flex flex-col gap-2"}>
          <div className={"flex items-center justify-between"}>
            <Label className={"text-muted-foreground text-xs"}>Blur</Label>
            <span className={"text-muted-foreground text-xs"}>{properties.shadowBlur}px</span>
          </div>
          <Slider
            max={50}
            min={0}
            onValueChange={([value]) => handlePropertyChange("shadowBlur", value)}
            onValueCommit={handlePropertyBlur}
            step={1}
            value={[properties.shadowBlur || 0]}
          />
        </div>

        {/* Shadow Offset */}
        <div className={"grid grid-cols-2 gap-2"}>
          <div className={"flex flex-col gap-1"}>
            <Label className={"text-muted-foreground text-xs"}>Offset X</Label>
            <Input
              className={"h-8"}
              onBlur={handlePropertyBlur}
              onChange={(e) => handlePropertyChange("shadowOffsetX", parseInt(e.target.value, 10) || 0)}
              type={"number"}
              value={properties.shadowOffsetX || 0}
            />
          </div>
          <div className={"flex flex-col gap-1"}>
            <Label className={"text-muted-foreground text-xs"}>Offset Y</Label>
            <Input
              className={"h-8"}
              onBlur={handlePropertyBlur}
              onChange={(e) => handlePropertyChange("shadowOffsetY", parseInt(e.target.value, 10) || 0)}
              type={"number"}
              value={properties.shadowOffsetY || 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Adjustments Section
// ============================================================================

type ImageFilters = {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
  grayscale: boolean;
};

function AdjustmentsSection() {
  const { canvas, selectedObjects, saveHistory } = useDesigner();
  const selectedObject = selectedObjects[0] as FabricObject | undefined;
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    hue: 0,
    grayscale: false,
  });

  useEffect(() => {
    if (!selectedObject || selectedObject.type !== "image") {
      return;
    }

    // Read current filters from the image object
    const imageObj = selectedObject as unknown as Record<string, unknown>;
    const imageFilters = (imageObj.filters as unknown[]) || [];
    const newFilters = { ...filters };

    imageFilters.forEach((filter: unknown) => {
      if (!filter || typeof filter !== "object") return;
      const filterObj = filter as {
        type?: string;
        brightness?: number;
        contrast?: number;
        saturation?: number;
        blur?: number;
        rotation?: number;
      };

      if (filterObj.type === "Brightness" && filterObj.brightness !== undefined) {
        newFilters.brightness = Math.round(filterObj.brightness * 100);
      } else if (filterObj.type === "Contrast" && filterObj.contrast !== undefined) {
        newFilters.contrast = Math.round(filterObj.contrast * 100);
      } else if (filterObj.type === "Saturation" && filterObj.saturation !== undefined) {
        newFilters.saturation = Math.round(filterObj.saturation * 100);
      } else if (filterObj.type === "Blur" && filterObj.blur !== undefined) {
        newFilters.blur = filterObj.blur;
      } else if (filterObj.type === "HueRotation" && filterObj.rotation !== undefined) {
        newFilters.hue = Math.round(filterObj.rotation * (180 / Math.PI));
      } else if (filterObj.type === "Grayscale") {
        newFilters.grayscale = true;
      }
    });

    setFilters(newFilters);
  }, [selectedObject]);

  function applyFilter(filterType: string, value: unknown) {
    if (!canvas || !selectedObject || selectedObject.type !== "image") return;

    const { filters: Filters } = require("fabric");
    const imgObj = selectedObject as unknown as Record<string, unknown>;
    const currentFilters = (imgObj.filters as unknown[]) || [];

    // Remove existing filter of this type
    const otherFilters = currentFilters.filter((f: unknown) => {
      if (!f || typeof f !== "object") return true;
      return (f as { type?: string }).type !== filterType;
    });

    // Add new filter if value is not default
    if (filterType === "Brightness" && value !== 0) {
      otherFilters.push(new Filters.Brightness({ brightness: (value as number) / 100 }));
    } else if (filterType === "Contrast" && value !== 0) {
      otherFilters.push(new Filters.Contrast({ contrast: (value as number) / 100 }));
    } else if (filterType === "Saturation" && value !== 0) {
      otherFilters.push(new Filters.Saturation({ saturation: (value as number) / 100 }));
    } else if (filterType === "Blur" && value !== 0) {
      otherFilters.push(new Filters.Blur({ blur: value as number }));
    } else if (filterType === "HueRotation" && value !== 0) {
      otherFilters.push(new Filters.HueRotation({ rotation: ((value as number) * Math.PI) / 180 }));
    } else if (filterType === "Grayscale" && value === true) {
      otherFilters.push(new Filters.Grayscale());
    }

    imgObj.filters = otherFilters as unknown[];
    (imgObj.applyFilters as (() => void) | undefined)?.();
    canvas.renderAll();
  }

  function handleFilterChange(key: keyof ImageFilters, value: number | boolean) {
    setFilters((prev) => ({ ...prev, [key]: value }));

    const filterTypeMap: { [key: string]: string } = {
      brightness: "Brightness",
      contrast: "Contrast",
      saturation: "Saturation",
      blur: "Blur",
      hue: "HueRotation",
      grayscale: "Grayscale",
    };

    applyFilter(filterTypeMap[key], value);
  }

  function handleFilterBlur() {
    saveHistory();
  }

  function handleFlipImage(direction: "horizontal" | "vertical") {
    if (!selectedObject) return;
    const key = direction === "horizontal" ? "flipX" : "flipY";
    const currentValue = selectedObject[key as keyof FabricObject] as boolean;
    selectedObject.set({ [key]: !currentValue });
    selectedObject.setCoords();
    canvas?.renderAll();
    saveHistory();
  }

  function handleResetFilters() {
    if (!selectedObject || selectedObject.type !== "image") return;
    const imgObj = selectedObject as unknown as Record<string, unknown>;
    imgObj.filters = [];
    (imgObj.applyFilters as (() => void) | undefined)?.();
    canvas?.renderAll();
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      hue: 0,
      grayscale: false,
    });
    saveHistory();
  }

  if (!selectedObject) {
    return (
      <div className={"flex flex-col items-center justify-center py-8 text-center"}>
        <AlertTriangle className={"h-10 w-10 text-muted-foreground/50"} />
        <p className={"mt-2 text-muted-foreground text-sm"}>No selection</p>
        <p className={"text-muted-foreground text-xs"}>Select an image to adjust</p>
      </div>
    );
  }

  // Only show adjustments for images
  if (selectedObject.type !== "image") {
    return (
      <div className={"flex flex-col items-center justify-center py-8 text-center"}>
        <Image className={"h-10 w-10 text-muted-foreground/50"} />
        <p className={"mt-2 text-muted-foreground text-sm"}>Image adjustments only</p>
        <p className={"text-muted-foreground text-xs"}>Select an image to see adjustments</p>
      </div>
    );
  }

  return (
    <div className={"flex flex-col gap-4 p-3"}>
      {/* Flip Controls */}
      <div className={"flex items-center gap-2"}>
        <Button
          className={"h-8 flex-1"}
          onClick={() => handleFlipImage("horizontal")}
          size={"sm"}
          type={"button"}
          variant={"outline"}
        >
          <FlipHorizontal className={"mr-1.5 h-3.5 w-3.5"} />
          Flip H
        </Button>
        <Button
          className={"h-8 flex-1"}
          onClick={() => handleFlipImage("vertical")}
          size={"sm"}
          type={"button"}
          variant={"outline"}
        >
          <FlipVertical className={"mr-1.5 h-3.5 w-3.5"} />
          Flip V
        </Button>
      </div>

      <Separator />

      {/* Brightness */}
      <div className={"flex flex-col gap-2"}>
        <div className={"flex items-center justify-between"}>
          <Label className={"text-muted-foreground text-xs"}>Brightness</Label>
          <span className={"text-muted-foreground text-xs"}>
            {filters.brightness > 0 ? "+" : ""}
            {filters.brightness}
          </span>
        </div>
        <Slider
          max={100}
          min={-100}
          onValueChange={([value]) => handleFilterChange("brightness", value)}
          onValueCommit={handleFilterBlur}
          step={1}
          value={[filters.brightness]}
        />
      </div>

      {/* Contrast */}
      <div className={"flex flex-col gap-2"}>
        <div className={"flex items-center justify-between"}>
          <Label className={"text-muted-foreground text-xs"}>Contrast</Label>
          <span className={"text-muted-foreground text-xs"}>
            {filters.contrast > 0 ? "+" : ""}
            {filters.contrast}
          </span>
        </div>
        <Slider
          max={100}
          min={-100}
          onValueChange={([value]) => handleFilterChange("contrast", value)}
          onValueCommit={handleFilterBlur}
          step={1}
          value={[filters.contrast]}
        />
      </div>

      {/* Saturation */}
      <div className={"flex flex-col gap-2"}>
        <div className={"flex items-center justify-between"}>
          <Label className={"text-muted-foreground text-xs"}>Saturation</Label>
          <span className={"text-muted-foreground text-xs"}>
            {filters.saturation > 0 ? "+" : ""}
            {filters.saturation}
          </span>
        </div>
        <Slider
          max={100}
          min={-100}
          onValueChange={([value]) => handleFilterChange("saturation", value)}
          onValueCommit={handleFilterBlur}
          step={1}
          value={[filters.saturation]}
        />
      </div>

      {/* Blur */}
      <div className={"flex flex-col gap-2"}>
        <div className={"flex items-center justify-between"}>
          <Label className={"text-muted-foreground text-xs"}>Blur</Label>
          <span className={"text-muted-foreground text-xs"}>{filters.blur.toFixed(1)}</span>
        </div>
        <Slider
          max={1}
          min={0}
          onValueChange={([value]) => handleFilterChange("blur", value)}
          onValueCommit={handleFilterBlur}
          step={0.01}
          value={[filters.blur]}
        />
      </div>

      {/* Hue Rotation */}
      <div className={"flex flex-col gap-2"}>
        <div className={"flex items-center justify-between"}>
          <Label className={"text-muted-foreground text-xs"}>Hue</Label>
          <span className={"text-muted-foreground text-xs"}>{filters.hue}°</span>
        </div>
        <Slider
          max={360}
          min={0}
          onValueChange={([value]) => handleFilterChange("hue", value)}
          onValueCommit={handleFilterBlur}
          step={1}
          value={[filters.hue]}
        />
      </div>

      {/* Grayscale */}
      <div className={"flex items-center justify-between"}>
        <Label className={"text-muted-foreground text-xs"}>Grayscale</Label>
        <input
          checked={filters.grayscale}
          className={"h-4 w-4"}
          onChange={(e) => {
            handleFilterChange("grayscale", e.target.checked);
            handleFilterBlur();
          }}
          type={"checkbox"}
        />
      </div>

      <Separator />

      {/* Reset Filters */}
      <Button className={"h-8 w-full"} onClick={handleResetFilters} size={"sm"} type={"button"} variant={"outline"}>
        <RotateCcw className={"mr-1.5 h-3.5 w-3.5"} />
        Reset All Filters
      </Button>
    </div>
  );
}
