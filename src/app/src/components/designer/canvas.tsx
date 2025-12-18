"use client";

import { cn } from "@/lib/utils";
import { Canvas } from "fabric";
import { useCallback, useEffect, useRef } from "react";
import { useDesigner } from "./hooks/use-designer";

type DesignerCanvasProps = {
  className?: string;
};

export const DesignerCanvas = ({ className }: DesignerCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  const { setCanvas, canvasSize, zoom, gridEnabled, gridSize, setSelectedObjects, saveHistory, setLayers } =
    useDesigner();

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

  const drawGrid = useCallback(
    (canvas: Canvas) => {
      if (!gridEnabled) return;

      const gridLines: string[] = [];
      const width = canvasSize.width;
      const height = canvasSize.height;

      for (let i = 0; i <= width; i += gridSize) {
        gridLines.push(`M ${i} 0 L ${i} ${height}`);
      }
      for (let i = 0; i <= height; i += gridSize) {
        gridLines.push(`M 0 ${i} L ${width} ${i}`);
      }

      // We'll handle grid via CSS background instead to avoid polluting canvas
    },
    [gridEnabled, gridSize, canvasSize],
  );

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

    const handleObjectMoving = (e: {
      target?: { left?: number; top?: number; set: (opts: { left?: number; top?: number }) => void };
    }) => {
      if (!gridEnabled || !e.target) return;

      const obj = e.target;
      const left = Math.round((obj.left || 0) / gridSize) * gridSize;
      const top = Math.round((obj.top || 0) / gridSize) * gridSize;

      obj.set({
        left,
        top,
      });
    };

    canvas.on("object:moving", handleObjectMoving);

    return () => {
      canvas.off("object:moving", handleObjectMoving);
    };
  }, [gridEnabled, gridSize]);

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
    <div ref={containerRef} className={cn("bg-muted/50 flex items-center justify-center overflow-auto p-8", className)}>
      <div
        className={cn("relative shadow-lg", "ring-border ring-1")}
        style={{
          width: canvasSize.width * zoom,
          height: canvasSize.height * zoom,
          ...gridBackground,
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
