"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Lock,
  MapPin,
  RotateCcw,
  Settings,
  Trash2,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FallbackImage } from "../../../shared/components/fallback-image";
import type { PrintArea } from "../../types";
import { useImprinter } from "../hooks/use-imprinter";

type RightPanelProps = {
  className?: string;
};

export function RightPanel({ className }: RightPanelProps) {
  const [printAreaOpen, setPrintAreaOpen] = useState(true);
  const [designsOpen, setDesignsOpen] = useState(true);
  const [transformOpen, setTransformOpen] = useState(true);
  const [width, setWidth] = useState(288);
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

  return (
    <div
      ref={panelRef}
      className={cn("bg-background relative flex h-full flex-col border-l", className)}
      style={{ width }}
    >
      <div
        className={cn(
          "hover:bg-primary absolute top-0 left-0 h-full w-1 cursor-ew-resize transition-colors",
          isResizing && "bg-primary",
        )}
        onMouseDown={handleMouseDown}
      />

      <PanelHeader />

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          <PrintAreaSection open={printAreaOpen} onOpenChange={setPrintAreaOpen} />
          <Separator className="my-2" />
          <AppliedDesignsSection open={designsOpen} onOpenChange={setDesignsOpen} />
          <Separator className="my-2" />
          <TransformSection open={transformOpen} onOpenChange={setTransformOpen} />
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Panel Header
// ============================================================================

function PanelHeader() {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        <span className="text-sm font-medium">Properties</span>
      </div>
    </div>
  );
}

// ============================================================================
// Print Area Section
// ============================================================================

type PrintAreaSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PrintAreaSection({ open, onOpenChange }: PrintAreaSectionProps) {
  const { activePrintArea, setActivePrintArea, availablePrintAreas, selectedProduct, placementMode, setPlacementMode } =
    useImprinter();

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium">Print Area</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-2 pt-3 pb-2">
        {!selectedProduct ? (
          <p className="text-muted-foreground text-xs">Select a product first</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Active Area</Label>
              <Select value={activePrintArea} onValueChange={(v) => setActivePrintArea(v as PrintArea)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePrintAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Placement Mode</Label>
              <div className="flex gap-1">
                <Button
                  variant={placementMode === "zone" ? "default" : "outline"}
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => setPlacementMode("zone")}
                >
                  Zone
                </Button>
                <Button
                  variant={placementMode === "free" ? "default" : "outline"}
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => setPlacementMode("free")}
                >
                  Free
                </Button>
              </div>
              <p className="text-muted-foreground text-[10px]">
                {placementMode === "zone"
                  ? "Designs snap to the active print area zone."
                  : "Click anywhere on the model to place a design."}
              </p>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Applied Designs Section (Layer System)
// ============================================================================

type AppliedDesignsSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AppliedDesignsSection({ open, onOpenChange }: AppliedDesignsSectionProps) {
  const {
    appliedDesigns,
    selectedDesignId,
    selectDesign,
    removeDesign,
    duplicateDesign,
    moveDesignUp,
    moveDesignDown,
    toggleDesignVisibility,
    toggleDesignLock,
    availablePrintAreas,
  } = useImprinter();

  const getPrintAreaName = (areaId: string) => {
    const area = availablePrintAreas.find((a) => a.id === areaId);
    return area?.name || areaId;
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span className="text-sm font-medium">Layers</span>
          <span className="text-muted-foreground text-xs">({appliedDesigns.length})</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 px-2 pt-3 pb-2">
        {appliedDesigns.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-muted-foreground text-xs">No designs applied</p>
          </div>
        ) : (
          [...appliedDesigns].reverse().map((design, _idx) => (
            <div
              key={design.id}
              className={cn(
                "hover:bg-accent group rounded-md border p-1.5 text-sm transition-colors",
                selectedDesignId === design.id && "bg-accent border-primary",
                !design.visible && "opacity-50",
              )}
            >
              <div className="flex items-center gap-1.5">
                <button
                  className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
                  onClick={() => selectDesign(design.id)}
                >
                  {design.designData.coverId && (
                    <FallbackImage
                      src={
                        design.designData.coverId.startsWith("blob:") || design.designData.coverId.startsWith("data:")
                          ? design.designData.coverId
                          : `/assets/${design.designData.coverId}/view`
                      }
                      alt=""
                      className="h-7 w-7 shrink-0 rounded border object-cover"
                      showBadge={false}
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="w-full truncate text-left text-xs font-medium">{design.designData.name}</span>
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {getPrintAreaName(design.printArea)}
                    </Badge>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => toggleDesignVisibility(design.id)}
                    title={design.visible ? "Hide" : "Show"}
                  >
                    {design.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => toggleDesignLock(design.id)}
                    title={design.locked ? "Unlock" : "Lock"}
                  >
                    {design.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveDesignUp(design.id)}
                    title="Move up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveDesignDown(design.id)}
                    title="Move down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => duplicateDesign(design.id)}
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => removeDesign(design.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Transform Section
// ============================================================================

type TransformSectionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function TransformSection({ open, onOpenChange }: TransformSectionProps) {
  const {
    selectedDesignId,
    appliedDesigns,
    updateDesignTransform,
    updateDesignOpacity,
    updateDesignPrintArea,
    availablePrintAreas,
  } = useImprinter();

  const selectedDesign = appliedDesigns.find((d) => d.id === selectedDesignId);

  if (!selectedDesign) {
    return (
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm font-medium">Transform</span>
          </div>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-2 pt-3 pb-2">
          <p className="text-muted-foreground text-xs">Select a design to transform</p>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const isLocked = selectedDesign.locked;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          <span className="text-sm font-medium">Transform</span>
          {isLocked && <Lock className="text-muted-foreground h-3 w-3" />}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-2 pt-3 pb-2">
        <div className="space-y-2">
          <Label className="text-xs">Print Area</Label>
          <Select
            value={selectedDesign.printArea}
            onValueChange={(v) => updateDesignPrintArea(selectedDesign.id, v as PrintArea)}
            disabled={isLocked}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availablePrintAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Position X</Label>
            <span className="text-muted-foreground text-[10px]">{selectedDesign.transform.position[0].toFixed(2)}</span>
          </div>
          <Slider
            value={[selectedDesign.transform.position[0]]}
            onValueChange={([x]) =>
              updateDesignTransform(selectedDesign.id, {
                position: [x, selectedDesign.transform.position[1], selectedDesign.transform.position[2]],
              })
            }
            min={-1}
            max={1}
            step={0.01}
            disabled={isLocked}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Position Y</Label>
            <span className="text-muted-foreground text-[10px]">{selectedDesign.transform.position[1].toFixed(2)}</span>
          </div>
          <Slider
            value={[selectedDesign.transform.position[1]]}
            onValueChange={([y]) =>
              updateDesignTransform(selectedDesign.id, {
                position: [selectedDesign.transform.position[0], y, selectedDesign.transform.position[2]],
              })
            }
            min={-1}
            max={1}
            step={0.01}
            disabled={isLocked}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Scale</Label>
            <span className="text-muted-foreground text-[10px]">{selectedDesign.transform.scale[0].toFixed(1)}x</span>
          </div>
          <Slider
            value={[selectedDesign.transform.scale[0]]}
            onValueChange={([s]) =>
              updateDesignTransform(selectedDesign.id, {
                scale: [s, s, s],
              })
            }
            min={0.1}
            max={3}
            step={0.1}
            disabled={isLocked}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Rotation</Label>
            <span className="text-muted-foreground text-[10px]">
              {Math.round(selectedDesign.transform.rotation[2])}°
            </span>
          </div>
          <Slider
            value={[selectedDesign.transform.rotation[2]]}
            onValueChange={([r]) =>
              updateDesignTransform(selectedDesign.id, {
                rotation: [0, 0, r],
              })
            }
            min={0}
            max={360}
            step={1}
            disabled={isLocked}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opacity</Label>
            <span className="text-muted-foreground text-[10px]">{Math.round(selectedDesign.opacity * 100)}%</span>
          </div>
          <Slider
            value={[selectedDesign.opacity * 100]}
            onValueChange={([o]) => {
              updateDesignOpacity(selectedDesign.id, o / 100);
            }}
            min={0}
            max={100}
            step={1}
            disabled={isLocked}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          disabled={isLocked}
          onClick={() =>
            updateDesignTransform(selectedDesign.id, {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            })
          }
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Reset Transform
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
