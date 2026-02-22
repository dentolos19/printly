"use client";

import { cn } from "@/lib/utils";
import { Canvas } from "fabric";
import { useCallback, useEffect, useRef } from "react";
import { CanvasContextMenu } from "./canvas-context-menu";
import { useDesigner } from "./hooks";

type DesignerCanvasProps = {
  className?: string;
};

export function DesignerCanvas({ className }: DesignerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  const {
    setCanvas,
    canvasSize,
    zoom,
    gridEnabled,
    gridSize,
    snappingEnabled,
    setSelectedObjects,
    saveHistory,
    setLayers,
  } = useDesigner();

  const updateLayers = useCallback(() => {
    if (!fabricRef.current) return;

    const objects = fabricRef.current.getObjects();
    const newLayers = objects.map((obj, index) => ({
      id: (obj as typeof obj & { id?: string }).id || `layer-${index}`,
      name: (obj as typeof obj & { name?: string }).name || `${obj.type} ${index + 1}`,
      type: obj.type || "object",
      visible: obj.visible !== false,
      locked: !obj.selectable,
      object: obj,
    }));

    setLayers(newLayers.reverse());
  }, [setLayers]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    setCanvas(canvas);

    // Selection events
    canvas.on("selection:created", (e) => {
      setSelectedObjects(e.selected || []);
    });

    canvas.on("selection:updated", (e) => {
      setSelectedObjects(e.selected || []);
    });

    canvas.on("selection:cleared", () => {
      setSelectedObjects([]);
    });

    // Object modification events
    canvas.on("object:modified", () => {
      saveHistory();
      updateLayers();
    });

    canvas.on("object:added", () => {
      updateLayers();
    });

    canvas.on("object:removed", () => {
      updateLayers();
    });

    canvas.on("path:created", () => {
      saveHistory();
      updateLayers();
    });

    // Initial history save
    saveHistory();

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      setCanvas(null);
    };
  }, []);

  // Handle canvas size changes
  useEffect(() => {
    if (!fabricRef.current) return;

    fabricRef.current.setDimensions({
      width: canvasSize.width,
      height: canvasSize.height,
    });
    fabricRef.current.renderAll();
  }, [canvasSize]);

  // Handle zoom changes
  useEffect(() => {
    if (!fabricRef.current) return;

    fabricRef.current.setZoom(zoom);
    fabricRef.current.setDimensions({
      width: canvasSize.width * zoom,
      height: canvasSize.height * zoom,
    });
    fabricRef.current.renderAll();
  }, [zoom, canvasSize]);

  // Snap to grid functionality
  useEffect(() => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;
    const SNAP_THRESHOLD = 8;

    function handleObjectMoving(e: {
      target?: {
        left?: number;
        top?: number;
        visible?: boolean;
        set: (opts: { left?: number; top?: number }) => void;
        setCoords: () => void;
        getBoundingRect: () => {
          left: number;
          top: number;
          width: number;
          height: number;
        };
      };
    }) {
      if (!e.target) return;

      const obj = e.target;
      if (gridEnabled) {
        const left = Math.round((obj.left || 0) / gridSize) * gridSize;
        const top = Math.round((obj.top || 0) / gridSize) * gridSize;

        obj.set({
          left,
          top,
        });
      }

      if (!snappingEnabled) return;

      const targetBounds = obj.getBoundingRect();
      const targetAnchorsX = [
        targetBounds.left,
        targetBounds.left + targetBounds.width / 2,
        targetBounds.left + targetBounds.width,
      ];
      const targetAnchorsY = [
        targetBounds.top,
        targetBounds.top + targetBounds.height / 2,
        targetBounds.top + targetBounds.height,
      ];

      const snapAnchorsX = [0, canvas.getWidth() / 2, canvas.getWidth()];
      const snapAnchorsY = [0, canvas.getHeight() / 2, canvas.getHeight()];

      for (const other of canvas.getObjects()) {
        if (other === obj || other.visible === false) continue;

        const otherBounds = other.getBoundingRect();
        snapAnchorsX.push(
          otherBounds.left,
          otherBounds.left + otherBounds.width / 2,
          otherBounds.left + otherBounds.width,
        );
        snapAnchorsY.push(
          otherBounds.top,
          otherBounds.top + otherBounds.height / 2,
          otherBounds.top + otherBounds.height,
        );
      }

      let bestDx: number | null = null;
      let bestDy: number | null = null;

      for (const targetX of targetAnchorsX) {
        for (const snapX of snapAnchorsX) {
          const dx = snapX - targetX;
          if (Math.abs(dx) <= SNAP_THRESHOLD && (bestDx === null || Math.abs(dx) < Math.abs(bestDx))) {
            bestDx = dx;
          }
        }
      }

      for (const targetY of targetAnchorsY) {
        for (const snapY of snapAnchorsY) {
          const dy = snapY - targetY;
          if (Math.abs(dy) <= SNAP_THRESHOLD && (bestDy === null || Math.abs(dy) < Math.abs(bestDy))) {
            bestDy = dy;
          }
        }
      }

      if (bestDx !== null || bestDy !== null) {
        obj.set({
          left: (obj.left || 0) + (bestDx ?? 0),
          top: (obj.top || 0) + (bestDy ?? 0),
        });
        obj.setCoords();
      }
    }

    canvas.on("object:moving", handleObjectMoving);

    return () => {
      canvas.off("object:moving", handleObjectMoving);
    };
  }, [gridEnabled, gridSize, snappingEnabled]);

  const gridBackground = gridEnabled
    ? {
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
      }
    : {};

  return (
    <CanvasContextMenu>
      <div
        ref={containerRef}
        data-canvas-container
        className={cn("bg-muted/50 flex flex-1 items-center justify-center overflow-auto", className)}
      >
        {/* Canvas container with drop shadow effect like in Mockly */}
        <div className={"relative"}>
          {/* Shadow/reflection effect */}
          <div
            className={"absolute -bottom-4 left-1/2 -translate-x-1/2 transform"}
            style={{
              width: canvasSize.width * zoom * 0.8,
              height: 20,
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 70%)",
            }}
          />

          {/* Corner shadows for print-effect */}
          <div
            className={"absolute top-1/2 -left-4 -translate-y-1/2 transform"}
            style={{
              width: 20,
              height: canvasSize.height * zoom * 0.6,
              background: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 100%)",
            }}
          />
          <div
            className={"absolute top-1/2 -right-4 -translate-y-1/2 transform"}
            style={{
              width: 20,
              height: canvasSize.height * zoom * 0.6,
              background: "linear-gradient(to left, transparent 0%, rgba(0,0,0,0.08) 100%)",
            }}
          />
          <div
            className={"absolute -top-4 left-1/2 -translate-x-1/2 transform"}
            style={{
              width: canvasSize.width * zoom * 0.6,
              height: 20,
              background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.08) 100%)",
            }}
          />

          {/* Main canvas wrapper */}
          <div
            className={cn("relative bg-white shadow-xl ring-1 ring-black/5")}
            style={{
              width: canvasSize.width * zoom,
              height: canvasSize.height * zoom,
              ...gridBackground,
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </CanvasContextMenu>
  );
}
