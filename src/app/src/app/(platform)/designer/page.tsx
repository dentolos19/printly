"use client";

import * as fabric from "fabric";
import { useEffect, useRef } from "react";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  const toggleEditing = () => {
    if (fabricRef.current) {
      const isEditing = fabricRef.current.isDrawingMode;
      fabricRef.current.isDrawingMode = !isEditing;
    }
  };

  const addText = () => {
    if (fabricRef.current) {
      const text = new fabric.Textbox("New Text", {
        left: 100,
        top: 100,
        width: 200,
        fontSize: 20,
        fill: "#000000",
      });
      fabricRef.current.add(text);
      fabricRef.current.setActiveObject(text);
    }
  };

  useEffect(() => {
    // Initialize canvas
    const canvas = new fabric.Canvas(canvasRef.current!, {
      backgroundColor: "#ffffff",
    });
    fabricRef.current = canvas;

    const resizeCanvas = () => {
      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.renderAll();
    };

    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.dispose();
    };
  }, []);

  return (
    <div className={"grid grid-cols-[auto,1fr] h-dvh"}>
      <div className={"border-r w-12"}></div>
      <div ref={containerRef}>
        <canvas ref={canvasRef} className={"border rounded-lg shadow"} />
      </div>
    </div>
  );
}