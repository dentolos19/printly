"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignCenterVertical,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Download,
  FileImage,
  FileJson,
  Grid3X3,
  Group,
  Image,
  LayoutTemplate,
  Minus,
  MousePointer2,
  MoveHorizontal,
  MoveVertical,
  Redo2,
  Square,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Ungroup,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDesigner } from "./hooks/use-designer";
import type { CanvasPreset, ExportFormat } from "./types";
import { CANVAS_PRESETS } from "./types";

export const DesignerToolbar = () => {
  const {
    activeTool,
    setActiveTool,
    canvasSize,
    setCanvasSize,
    zoom,
    setZoom,
    gridEnabled,
    setGridEnabled,
    gridSize,
    setGridSize,
    canUndo,
    canRedo,
    undo,
    redo,
    addText,
    addRectangle,
    addCircle,
    addTriangle,
    addLine,
    addImage,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    alignObjects,
    distributeObjects,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    exportCanvas,
    clearCanvas,
    selectedObjects,
  } = useDesigner();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customWidth, setCustomWidth] = useState(canvasSize.width.toString());
  const [customHeight, setCustomHeight] = useState(canvasSize.height.toString());

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        addImage(url);
      };
      reader.readAsDataURL(file);

      e.target.value = "";
    },
    [addImage],
  );

  const handlePresetSelect = useCallback(
    (preset: CanvasPreset) => {
      setCanvasSize({ width: preset.width, height: preset.height });
      setCustomWidth(preset.width.toString());
      setCustomHeight(preset.height.toString());
    },
    [setCanvasSize],
  );

  const handleCustomSizeApply = useCallback(() => {
    const width = parseInt(customWidth, 10);
    const height = parseInt(customHeight, 10);

    if (width > 0 && height > 0) {
      setCanvasSize({ width, height });
    }
  }, [customWidth, customHeight, setCanvasSize]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      exportCanvas(format);
    },
    [exportCanvas],
  );

  const hasSelection = selectedObjects.length > 0;
  const hasMultipleSelection = selectedObjects.length > 1;
  const canGroup =
    hasMultipleSelection && selectedObjects[0]?.type !== "activeselection" && selectedObjects[0]?.type !== "group";
  const canUngroup = selectedObjects.length === 1 && selectedObjects[0]?.type === "group";

  return (
    <div className={cn("bg-background flex items-center gap-1 border-b px-2 py-1.5", "flex-wrap")}>
      {/* Undo/Redo */}
      <div className={"flex items-center gap-0.5"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={undo} disabled={!canUndo}>
              <Undo2 className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Undo (Ctrl+Z)"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={redo} disabled={!canRedo}>
              <Redo2 className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Redo (Ctrl+Y)"}</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation={"vertical"} className={"mx-1 h-6"} />

      {/* Selection Tool */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={activeTool === "select"}
            onPressedChange={() => setActiveTool("select")}
            size={"sm"}
            className={"h-8 w-8 p-0"}
          >
            <MousePointer2 className={"h-4 w-4"} />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>{"Select (V)"}</TooltipContent>
      </Tooltip>

      <Separator orientation={"vertical"} className={"mx-1 h-6"} />

      {/* Add Elements */}
      <div className={"flex items-center gap-0.5"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => addText()}>
              <Type className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Add Text"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={addRectangle}>
              <Square className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Add Rectangle"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={addCircle}>
              <Circle className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Add Circle"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={addTriangle}>
              <Triangle className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Add Triangle"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={addLine}>
              <Minus className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Add Line"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => fileInputRef.current?.click()}>
              <Image className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Add Image"}</TooltipContent>
        </Tooltip>
        <input ref={fileInputRef} type={"file"} accept={"image/*"} className={"hidden"} onChange={handleImageUpload} />
      </div>

      <Separator orientation={"vertical"} className={"mx-1 h-6"} />

      {/* Object Actions */}
      <div className={"flex items-center gap-0.5"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"ghost"}
              size={"icon"}
              className={"h-8 w-8"}
              onClick={duplicateSelected}
              disabled={!hasSelection}
            >
              <Copy className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Duplicate (Ctrl+D)"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"ghost"}
              size={"icon"}
              className={"h-8 w-8"}
              onClick={deleteSelected}
              disabled={!hasSelection}
            >
              <Trash2 className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Delete (Del)"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={groupSelected} disabled={!canGroup}>
              <Group className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Group (Ctrl+G)"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"ghost"}
              size={"icon"}
              className={"h-8 w-8"}
              onClick={ungroupSelected}
              disabled={!canUngroup}
            >
              <Ungroup className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Ungroup (Ctrl+Shift+G)"}</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation={"vertical"} className={"mx-1 h-6"} />

      {/* Alignment */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"ghost"} size={"sm"} className={"h-8 gap-1 px-2"} disabled={!hasMultipleSelection}>
            <AlignLeft className={"h-4 w-4"} />
            <span className={"text-xs"}>Align</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={"w-48 p-2"} align={"start"}>
          <div className={"flex flex-col gap-1"}>
            <Label className={"text-muted-foreground px-2 text-xs"}>Horizontal</Label>
            <div className={"flex gap-1"}>
              <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => alignObjects("left")}>
                <AlignLeft className={"h-4 w-4"} />
              </Button>
              <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => alignObjects("center")}>
                <AlignCenter className={"h-4 w-4"} />
              </Button>
              <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => alignObjects("right")}>
                <AlignRight className={"h-4 w-4"} />
              </Button>
            </div>

            <Label className={"text-muted-foreground mt-2 px-2 text-xs"}>Vertical</Label>
            <div className={"flex gap-1"}>
              <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => alignObjects("top")}>
                <AlignStartVertical className={"h-4 w-4"} />
              </Button>
              <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => alignObjects("middle")}>
                <AlignCenterVertical className={"h-4 w-4"} />
              </Button>
              <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"} onClick={() => alignObjects("bottom")}>
                <AlignEndVertical className={"h-4 w-4"} />
              </Button>
            </div>

            <Separator className={"my-2"} />

            <Label className={"text-muted-foreground px-2 text-xs"}>Distribute</Label>
            <div className={"flex gap-1"}>
              <Button
                variant={"ghost"}
                size={"icon"}
                className={"h-8 w-8"}
                onClick={() => distributeObjects("horizontal")}
                disabled={selectedObjects.length < 3}
              >
                <MoveHorizontal className={"h-4 w-4"} />
              </Button>
              <Button
                variant={"ghost"}
                size={"icon"}
                className={"h-8 w-8"}
                onClick={() => distributeObjects("vertical")}
                disabled={selectedObjects.length < 3}
              >
                <MoveVertical className={"h-4 w-4"} />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Layer Order */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"ghost"} size={"sm"} className={"h-8 gap-1 px-2"} disabled={!hasSelection}>
            <ChevronUp className={"h-4 w-4"} />
            <span className={"text-xs"}>Order</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={"w-40 p-2"} align={"start"}>
          <div className={"flex flex-col gap-1"}>
            <Button variant={"ghost"} size={"sm"} className={"h-8 justify-start gap-2"} onClick={bringToFront}>
              <ArrowUpToLine className={"h-4 w-4"} />
              <span>Bring to Front</span>
            </Button>
            <Button variant={"ghost"} size={"sm"} className={"h-8 justify-start gap-2"} onClick={bringForward}>
              <ChevronUp className={"h-4 w-4"} />
              <span>Bring Forward</span>
            </Button>
            <Button variant={"ghost"} size={"sm"} className={"h-8 justify-start gap-2"} onClick={sendBackward}>
              <ChevronDown className={"h-4 w-4"} />
              <span>Send Backward</span>
            </Button>
            <Button variant={"ghost"} size={"sm"} className={"h-8 justify-start gap-2"} onClick={sendToBack}>
              <ArrowDownToLine className={"h-4 w-4"} />
              <span>Send to Back</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation={"vertical"} className={"mx-1 h-6"} />

      {/* Canvas Size */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"ghost"} size={"sm"} className={"h-8 gap-1 px-2"}>
            <LayoutTemplate className={"h-4 w-4"} />
            <span className={"text-xs"}>
              {canvasSize.width} × {canvasSize.height}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={"w-64 p-3"} align={"start"}>
          <div className={"flex flex-col gap-3"}>
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-xs font-medium"}>Custom Size</Label>
              <div className={"flex gap-2"}>
                <div className={"flex-1"}>
                  <Label className={"text-muted-foreground text-xs"}>Width</Label>
                  <Input
                    type={"number"}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className={"h-8"}
                  />
                </div>
                <div className={"flex-1"}>
                  <Label className={"text-muted-foreground text-xs"}>Height</Label>
                  <Input
                    type={"number"}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className={"h-8"}
                  />
                </div>
              </div>
              <Button size={"sm"} className={"h-8"} onClick={handleCustomSizeApply}>
                Apply
              </Button>
            </div>

            <Separator />

            <div className={"flex flex-col gap-2"}>
              <Label className={"text-xs font-medium"}>Presets</Label>
              <div className={"grid max-h-48 grid-cols-1 gap-1 overflow-y-auto pr-1"}>
                {CANVAS_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={"ghost"}
                    size={"sm"}
                    className={"h-8 justify-between"}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <span className={"text-xs"}>{preset.name}</span>
                    <span className={"text-muted-foreground text-xs"}>
                      {preset.width}×{preset.height}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Grid */}
      <Popover>
        <PopoverTrigger asChild>
          <Toggle pressed={gridEnabled} onPressedChange={setGridEnabled} size={"sm"} className={"h-8 w-8 p-0"}>
            <Grid3X3 className={"h-4 w-4"} />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className={"w-48 p-3"} align={"start"}>
          <div className={"flex flex-col gap-3"}>
            <div className={"flex items-center justify-between"}>
              <Label className={"text-xs"}>Snap to Grid</Label>
              <Toggle pressed={gridEnabled} onPressedChange={setGridEnabled} size={"sm"}>
                {gridEnabled ? "On" : "Off"}
              </Toggle>
            </div>
            <div className={"flex flex-col gap-2"}>
              <Label className={"text-muted-foreground text-xs"}>Grid Size: {gridSize}px</Label>
              <Slider value={[gridSize]} onValueChange={([value]) => setGridSize(value)} min={5} max={50} step={5} />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation={"vertical"} className={"mx-1 h-6"} />

      {/* Zoom */}
      <div className={"flex items-center gap-0.5"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"ghost"}
              size={"icon"}
              className={"h-8 w-8"}
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              disabled={zoom <= 0.1}
            >
              <ZoomOut className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Zoom Out"}</TooltipContent>
        </Tooltip>

        <span className={"text-muted-foreground w-12 text-center text-xs"}>{Math.round(zoom * 100)}%</span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"ghost"}
              size={"icon"}
              className={"h-8 w-8"}
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              disabled={zoom >= 3}
            >
              <ZoomIn className={"h-4 w-4"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Zoom In"}</TooltipContent>
        </Tooltip>
      </div>

      <div className={"flex-1"} />

      {/* Export */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"default"} size={"sm"} className={"h-8 gap-1"}>
            <Download className={"h-4 w-4"} />
            <span>Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={"end"}>
          <DropdownMenuItem onClick={() => handleExport("png")}>
            <FileImage className={"mr-2 h-4 w-4"} />
            Export as PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("jpg")}>
            <FileImage className={"mr-2 h-4 w-4"} />
            Export as JPG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("svg")}>
            <FileImage className={"mr-2 h-4 w-4"} />
            Export as SVG
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleExport("json")}>
            <FileJson className={"mr-2 h-4 w-4"} />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={clearCanvas}>
            <Trash2 className={"mr-2 h-4 w-4"} />
            Clear Canvas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
