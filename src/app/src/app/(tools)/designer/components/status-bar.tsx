"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Magnet, Redo2, RotateCcw, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useDesigner } from "./hooks";

type StatusBarProps = {
  className?: string;
};

export function StatusBar({ className }: StatusBarProps) {
  const { canvasSize, zoom, setZoom, canUndo, canRedo, undo, redo, snappingEnabled, setSnappingEnabled } =
    useDesigner();

  function handleZoomIn() {
    setZoom(Math.min(zoom + 0.1, 3));
  }

  function handleZoomOut() {
    setZoom(Math.max(zoom - 0.1, 0.1));
  }

  function handleZoomSlider(value: number[]) {
    setZoom(value[0]);
  }

  function handleFitToScreen() {
    // Calculate fit zoom based on typical viewport
    const viewportWidth = window.innerWidth - 400; // Account for sidebars
    const viewportHeight = window.innerHeight - 150; // Account for header/footer
    const fitZoom = Math.min(viewportWidth / canvasSize.width, viewportHeight / canvasSize.height, 1);
    setZoom(Math.round(fitZoom * 100) / 100);
  }

  return (
    <div className={cn("bg-background flex h-8 items-center justify-between border-t px-3", className)}>
      {/* Left section - Document info */}
      <div className={"text-muted-foreground flex items-center gap-3 text-xs"}>
        <span>
          Doc: {canvasSize.width} x {canvasSize.height} px
        </span>
        <Separator orientation={"vertical"} className={"h-4"} />
        <span>RGB/8</span>
      </div>

      {/* Center section - Zoom controls */}
      <div className={"flex items-center gap-2"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type={"button"}
              variant={"ghost"}
              size={"icon"}
              className={"h-6 w-6"}
              onClick={handleZoomOut}
              disabled={zoom <= 0.1}
            >
              <ZoomOut className={"h-3.5 w-3.5"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        <div className={"flex w-24 items-center gap-2"}>
          <Slider value={[zoom]} onValueChange={handleZoomSlider} min={0.1} max={3} step={0.05} className={"flex-1"} />
        </div>

        <span className={"text-muted-foreground w-12 text-center text-xs"}>{Math.round(zoom * 100)}%</span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type={"button"}
              variant={"ghost"}
              size={"icon"}
              className={"h-6 w-6"}
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className={"h-3.5 w-3.5"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>
      </div>

      {/* Right section - Undo/Redo/Reset */}
      <div className={"flex items-center gap-1"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type={"button"}
              variant={snappingEnabled ? "secondary" : "ghost"}
              size={"sm"}
              className={"h-6 gap-1.5 px-2"}
              onClick={() => setSnappingEnabled(!snappingEnabled)}
            >
              <Magnet className={"h-3.5 w-3.5"} />
              Snap
            </Button>
          </TooltipTrigger>
          <TooltipContent>Snap to canvas and nearby elements</TooltipContent>
        </Tooltip>

        <Separator orientation={"vertical"} className={"mx-1 h-4"} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type={"button"}
              variant={"ghost"}
              size={"icon"}
              className={"h-6 w-6"}
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className={"h-3.5 w-3.5"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type={"button"}
              variant={"ghost"}
              size={"icon"}
              className={"h-6 w-6"}
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className={"h-3.5 w-3.5"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <Separator orientation={"vertical"} className={"mx-1 h-4"} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"icon"} className={"h-6 w-6"} onClick={handleFitToScreen}>
              <RotateCcw className={"h-3.5 w-3.5"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to Screen</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
