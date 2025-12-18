"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Circle,
  Eye,
  EyeOff,
  GripVertical,
  Image,
  Layers,
  Lock,
  Minus,
  Square,
  Triangle,
  Type,
  Unlock,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDesigner } from "../hooks/use-designer";
import type { LayerItem } from "../types";

const getLayerIcon = (type: string) => {
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
};

export const LayersPanel = () => {
  const { canvas, layers, selectedObjects, saveHistory, setLayers } = useDesigner();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleLayerClick = useCallback(
    (layer: LayerItem) => {
      if (!canvas || layer.locked) return;

      canvas.discardActiveObject();
      canvas.setActiveObject(layer.object);
      canvas.renderAll();
    },
    [canvas],
  );

  const handleVisibilityToggle = useCallback(
    (layer: LayerItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canvas) return;

      layer.object.set({ visible: !layer.visible });
      canvas.renderAll();
      saveHistory();
    },
    [canvas, saveHistory],
  );

  const handleLockToggle = useCallback(
    (layer: LayerItem, e: React.MouseEvent) => {
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
    },
    [canvas, selectedObjects, saveHistory],
  );

  const isSelected = useCallback(
    (layer: LayerItem) => {
      return selectedObjects.some((obj) => obj === layer.object);
    },
    [selectedObjects],
  );

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());

    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = "0.5";
      }
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      if (draggedIndex === null || draggedIndex === index) return;
      setDragOverIndex(index);
    },
    [draggedIndex],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();

      if (draggedIndex === null || draggedIndex === dropIndex || !canvas) {
        handleDragEnd();
        return;
      }

      // Layers are displayed in reverse order (top layer first in UI)
      // So we need to convert UI indices to canvas indices
      const canvasObjects = canvas.getObjects();
      const totalObjects = canvasObjects.length;

      // Convert layer panel indices (reversed) to canvas indices
      const fromCanvasIndex = totalObjects - 1 - draggedIndex;
      const toCanvasIndex = totalObjects - 1 - dropIndex;

      const draggedObject = canvasObjects[fromCanvasIndex];

      if (!draggedObject) {
        handleDragEnd();
        return;
      }

      // Move the object to the new position
      canvas.remove(draggedObject);

      // Insert at the correct position
      const objectsAfterRemoval = canvas.getObjects();
      const insertIndex = Math.min(toCanvasIndex, objectsAfterRemoval.length);

      canvas.insertAt(insertIndex, draggedObject);
      canvas.renderAll();

      // Update layers state
      const newLayers = [...layers];
      const [movedLayer] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(dropIndex, 0, movedLayer);
      setLayers(newLayers);

      saveHistory();
      handleDragEnd();
    },
    [draggedIndex, canvas, layers, setLayers, saveHistory, handleDragEnd],
  );

  if (layers.length === 0) {
    return (
      <div className={"flex h-full flex-col items-center justify-center p-4"}>
        <Layers className={"text-muted-foreground/50 h-12 w-12"} />
        <p className={"text-muted-foreground mt-2 text-center text-sm"}>No layers yet</p>
        <p className={"text-muted-foreground text-center text-xs"}>Add elements to see them here</p>
      </div>
    );
  }

  return (
    <ScrollArea className={"h-full"}>
      <div className={"flex flex-col gap-0.5 p-2"}>
        {layers.map((layer, index) => {
          const Icon = getLayerIcon(layer.type);
          const selected = isSelected(layer);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={layer.id}
              draggable={!layer.locked}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                "hover:bg-accent cursor-pointer",
                selected && "bg-accent",
                layer.locked && "opacity-60",
                isDragging && "opacity-50",
                isDragOver && "border-primary border-t-2",
              )}
              onClick={() => handleLayerClick(layer)}
              role={"button"}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleLayerClick(layer);
                }
              }}
            >
              <GripVertical
                className={cn(
                  "text-muted-foreground h-4 w-4 shrink-0 cursor-grab opacity-0 group-hover:opacity-100",
                  layer.locked && "cursor-not-allowed",
                )}
              />

              <Icon className={"text-muted-foreground h-4 w-4 shrink-0"} />

              <span className={cn("flex-1 truncate text-sm", !layer.visible && "text-muted-foreground line-through")}>
                {layer.name}
              </span>

              <div className={"flex items-center gap-0.5"}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={"ghost"}
                      size={"icon"}
                      className={cn("h-6 w-6 opacity-0 group-hover:opacity-100", !layer.visible && "opacity-100")}
                      onClick={(e) => handleVisibilityToggle(layer, e)}
                    >
                      {layer.visible ? <Eye className={"h-3.5 w-3.5"} /> : <EyeOff className={"h-3.5 w-3.5"} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{layer.visible ? "Hide" : "Show"}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={"ghost"}
                      size={"icon"}
                      className={cn("h-6 w-6 opacity-0 group-hover:opacity-100", layer.locked && "opacity-100")}
                      onClick={(e) => handleLockToggle(layer, e)}
                    >
                      {layer.locked ? <Lock className={"h-3.5 w-3.5"} /> : <Unlock className={"h-3.5 w-3.5"} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{layer.locked ? "Unlock" : "Lock"}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
