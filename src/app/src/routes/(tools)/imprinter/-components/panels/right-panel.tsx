"use client";

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
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Slider } from "#/components/ui/slider";
import { cn } from "#/lib/utils";
import { FallbackImage } from "#/routes/(tools)/-shared/components/fallback-image";
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

      const deltaX = startXRef.current - e.clientX;
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

  return (
    <div
      className={cn("relative flex h-full flex-col border-l bg-background", className)}
      ref={panelRef}
      style={{ width }}
    >
      <div
        className={cn(
          "absolute top-0 left-0 z-10 h-full w-1.5 cursor-ew-resize transition-colors hover:bg-primary",
          isResizing && "bg-primary",
        )}
        onMouseDown={handleMouseDown}
      />

      <PanelHeader />

      <ScrollArea className="h-0 flex-1">
        <div className="space-y-1 p-2">
          <PrintAreaSection onOpenChange={setPrintAreaOpen} open={printAreaOpen} />
          <Separator className="my-2" />
          <AppliedDesignsSection onOpenChange={setDesignsOpen} open={designsOpen} />
          <Separator className="my-2" />
          <TransformSection onOpenChange={setTransformOpen} open={transformOpen} />
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
        <span className="font-medium text-sm">Properties</span>
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
    <Collapsible onOpenChange={onOpenChange} open={open}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 hover:bg-accent">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="font-medium text-sm">Print Area</span>
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
              <Select onValueChange={(v) => setActivePrintArea(v as PrintArea)} value={activePrintArea}>
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
                  className="h-7 flex-1 text-xs"
                  onClick={() => setPlacementMode("zone")}
                  size="sm"
                  variant={placementMode === "zone" ? "default" : "outline"}
                >
                  Zone
                </Button>
                <Button
                  className="h-7 flex-1 text-xs"
                  onClick={() => setPlacementMode("free")}
                  size="sm"
                  variant={placementMode === "free" ? "default" : "outline"}
                >
                  Free
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
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
    renameDesign,
    toggleDesignVisibility,
    toggleDesignLock,
    availablePrintAreas,
  } = useImprinter();
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startRenaming = useCallback((designId: string, currentName: string) => {
    setEditingDesignId(designId);
    setEditingName(currentName);
  }, []);

  const commitRenaming = useCallback(
    (designId: string, currentName: string) => {
      const trimmedName = editingName.trim();
      if (trimmedName && trimmedName !== currentName) {
        renameDesign(designId, trimmedName);
      }
      setEditingDesignId(null);
      setEditingName("");
    },
    [editingName, renameDesign],
  );

  const cancelRenaming = useCallback(() => {
    setEditingDesignId(null);
    setEditingName("");
  }, []);

  const getPrintAreaName = (areaId: string) => {
    const area = availablePrintAreas.find((a) => a.id === areaId);
    return area?.name || areaId;
  };

  return (
    <Collapsible onOpenChange={onOpenChange} open={open}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 hover:bg-accent">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span className="font-medium text-sm">Layers</span>
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
              className={cn(
                "group rounded-md border p-1.5 text-sm transition-colors hover:bg-accent",
                selectedDesignId === design.id && "border-primary bg-accent",
                !design.visible && "opacity-50",
              )}
              key={design.id}
            >
              <div className="flex items-center gap-1.5">
                <button
                  className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
                  onClick={() => selectDesign(design.id)}
                >
                  {design.designData.coverId && (
                    <FallbackImage
                      alt=""
                      className="h-7 w-7 shrink-0 rounded border object-cover"
                      showBadge={false}
                      src={
                        design.designData.coverId.startsWith("blob:") || design.designData.coverId.startsWith("data:")
                          ? design.designData.coverId
                          : `/assets/${design.designData.coverId}/view`
                      }
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    {editingDesignId === design.id ? (
                      <Input
                        autoFocus
                        className="h-6 text-xs"
                        onBlur={() => commitRenaming(design.id, design.name || design.designData.name)}
                        onChange={(e) => setEditingName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            commitRenaming(design.id, design.name || design.designData.name);
                          }
                          if (e.key === "Escape") {
                            cancelRenaming();
                          }
                        }}
                        value={editingName}
                      />
                    ) : (
                      <span
                        className="w-full truncate text-left font-medium text-xs"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startRenaming(design.id, design.name || design.designData.name);
                        }}
                        title="Double-click to rename"
                      >
                        {design.name || design.designData.name}
                      </span>
                    )}
                    <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                      {getPrintAreaName(design.printArea)}
                    </Badge>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    className="h-5 w-5"
                    onClick={() => toggleDesignVisibility(design.id)}
                    size="icon"
                    title={design.visible ? "Hide" : "Show"}
                    variant="ghost"
                  >
                    {design.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                  <Button
                    className="h-5 w-5"
                    onClick={() => toggleDesignLock(design.id)}
                    size="icon"
                    title={design.locked ? "Unlock" : "Lock"}
                    variant="ghost"
                  >
                    {design.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </Button>
                  <Button
                    className="h-5 w-5"
                    onClick={() => moveDesignUp(design.id)}
                    size="icon"
                    title="Move up"
                    variant="ghost"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    className="h-5 w-5"
                    onClick={() => moveDesignDown(design.id)}
                    size="icon"
                    title="Move down"
                    variant="ghost"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    className="h-5 w-5"
                    onClick={() => duplicateDesign(design.id)}
                    size="icon"
                    title="Duplicate"
                    variant="ghost"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    className="h-5 w-5"
                    onClick={() => removeDesign(design.id)}
                    size="icon"
                    title="Delete"
                    variant="ghost"
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
      <Collapsible onOpenChange={onOpenChange} open={open}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 hover:bg-accent">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            <span className="font-medium text-sm">Transform</span>
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
    <Collapsible onOpenChange={onOpenChange} open={open}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 hover:bg-accent">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          <span className="font-medium text-sm">Transform</span>
          {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-2 pt-3 pb-2">
        <div className="space-y-2">
          <Label className="text-xs">Print Area</Label>
          <Select
            disabled={isLocked}
            onValueChange={(v) => updateDesignPrintArea(selectedDesign.id, v as PrintArea)}
            value={selectedDesign.printArea}
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
            <span className="text-[10px] text-muted-foreground">{selectedDesign.transform.position[0].toFixed(2)}</span>
          </div>
          <Slider
            disabled={isLocked}
            max={1}
            min={-1}
            onValueChange={([x]) =>
              updateDesignTransform(selectedDesign.id, {
                position: [x, selectedDesign.transform.position[1], selectedDesign.transform.position[2]],
              })
            }
            step={0.01}
            value={[selectedDesign.transform.position[0]]}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Position Y</Label>
            <span className="text-[10px] text-muted-foreground">{selectedDesign.transform.position[1].toFixed(2)}</span>
          </div>
          <Slider
            disabled={isLocked}
            max={1}
            min={-1}
            onValueChange={([y]) =>
              updateDesignTransform(selectedDesign.id, {
                position: [selectedDesign.transform.position[0], y, selectedDesign.transform.position[2]],
              })
            }
            step={0.01}
            value={[selectedDesign.transform.position[1]]}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Scale</Label>
            <span className="text-[10px] text-muted-foreground">{selectedDesign.transform.scale[0].toFixed(1)}x</span>
          </div>
          <Slider
            disabled={isLocked}
            max={3}
            min={0.1}
            onValueChange={([s]) =>
              updateDesignTransform(selectedDesign.id, {
                scale: [s, s, s],
              })
            }
            step={0.1}
            value={[selectedDesign.transform.scale[0]]}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Rotation</Label>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(selectedDesign.transform.rotation[2])}°
            </span>
          </div>
          <Slider
            disabled={isLocked}
            max={360}
            min={0}
            onValueChange={([r]) =>
              updateDesignTransform(selectedDesign.id, {
                rotation: [0, 0, r],
              })
            }
            step={1}
            value={[selectedDesign.transform.rotation[2]]}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opacity</Label>
            <span className="text-[10px] text-muted-foreground">{Math.round(selectedDesign.opacity * 100)}%</span>
          </div>
          <Slider
            disabled={isLocked}
            max={100}
            min={0}
            onValueChange={([o]) => {
              updateDesignOpacity(selectedDesign.id, o / 100);
            }}
            step={1}
            value={[selectedDesign.opacity * 100]}
          />
        </div>

        <Button
          className="w-full text-xs"
          disabled={isLocked}
          onClick={() =>
            updateDesignTransform(selectedDesign.id, {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            })
          }
          size="sm"
          variant="outline"
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Reset Transform
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
