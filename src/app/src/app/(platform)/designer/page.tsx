"use client";

import { Button } from "@/components/ui/button";
import * as fabric from "fabric";
import { CircleIcon, DownloadIcon, MousePointerIcon, SquareIcon, TypeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const canvasRef = useRef(null);

  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

  const addSquare = () => {
    const element = new fabric.Rect({
      width: 100,
      height: 100,
      fill: "red",
      top: 50,
      left: 50,
    });

    canvas?.add(element);
  };

  const addText = () => {
    const element = new fabric.Textbox("Hello, Fabric.js!", {
      width: 200,
      fontSize: 20,
      top: 200,
      left: 50,
    });

    canvas?.add(element);
  };

  const downloadImage = () => {
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement("a");
    link.setAttribute("download", "canvas-image.png");
    link.setAttribute("href", dataURL);
    link.click();
  };

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current!, {
      width: 500,
      height: 500,
      backgroundColor: "#f5f5f5",
    });

    setCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  return (
    <div className={"relative grid place-items-center h-dvh"}>
      <div className={"absolute top-4 border rounded-md p-1"}>
        <Button variant={"ghost"} size={"icon"}>
          <MousePointerIcon />
        </Button>
        <Button variant={"ghost"} size={"icon"} onClick={addSquare}>
          <SquareIcon />
        </Button>
        <Button variant={"ghost"} size={"icon"}>
          <CircleIcon />
        </Button>
        <Button variant={"ghost"} size={"icon"} onClick={addText}>
          <TypeIcon />
        </Button>
        <Button variant={"ghost"} size={"icon"} onClick={downloadImage}>
          <DownloadIcon />
        </Button>
      </div>
      <canvas ref={canvasRef} className={"border rounded-lg shadow"}></canvas>
    </div>
  );
}