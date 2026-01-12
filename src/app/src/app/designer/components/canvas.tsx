"use client";

import { cn } from "@/lib/utils";
import { Canvas } from "fabric";
import { useCallback, useEffect, useRef } from "react";
import { useDesigner } from "./hooks";

type DesignerCanvasProps = {
  className?: string;
};

export function DesignerCanvas({ className }: DesignerCanvasProps) {
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

    function handleObjectMoving(e: {
      target?: { left?: number; top?: number; set: (opts: { left?: number; top?: number }) => void };
    }) {
      if (!gridEnabled || !e.target) return;

      const obj = e.target;
      const left = Math.round((obj.left || 0) / gridSize) * gridSize;
      const top = Math.round((obj.top || 0) / gridSize) * gridSize;

      obj.set({
        left,
        top,
      });
    }

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
    <div
      ref={containerRef}
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
  );
}
