import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as fabric from "fabric";
import {
  BrushIcon,
  CircleIcon,
  EraserIcon,
  ImageIcon,
  MousePointer2Icon,
  MoveIcon,
  PenIcon,
  SquareIcon,
  TriangleIcon,
} from "lucide-react";
import { ComponentProps, useEffect, useRef, useState } from "react";

type Tool = "select" | "move" | "pen" | "brush" | "eraser" | "square" | "circle" | "triangle" | "image";

export default function Designer(props: ComponentProps<"div">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);

  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");

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

  const handleSelectTool = () => {
    if (!canvas) return;
    canvas.selection = true;
    canvas.isDrawingMode = false;
  };

  const handleMoveTool = () => {
    if (!canvas) return;
    canvas.selection = false;
    canvas.forEachObject((obj) => {
      obj.selectable = false;
    });

    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on("mouse:down", (opt) => {
      const evt = opt.e as MouseEvent;
      isPanningRef.current = true;
      lastPosX = evt.clientX;
      lastPosY = evt.clientY;
    });

    canvas.on("mouse:move", (opt) => {
      if (!isPanningRef.current) return;
      const evt = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += evt.clientX - lastPosX;
        vpt[5] += evt.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on("mouse:up", () => {
      isPanningRef.current = false;
    });
  };

  const handlePenTool = () => {
    if (!canvas) return;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 2;
    canvas.freeDrawingBrush.color = "#000000";
  };

  const handleBrushTool = () => {
    if (!canvas) return;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 10;
    canvas.freeDrawingBrush.color = "#000000";
  };

  const handleEraserTool = () => {
    if (!canvas) return;
    canvas.isDrawingMode = false;
    canvas.selection = false;

    canvas.on("mouse:down", (opt) => {
      const pointer = canvas.getScenePoint(opt.e);
      const objects = canvas.getObjects();

      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj.containsPoint(pointer)) {
          canvas.remove(obj);
          canvas.requestRenderAll();
          break;
        }
      }
    });
  };

  const handleSquareTool = () => {
    if (!canvas) return;
    canvas.selection = false;

    let rect: fabric.Rect | null = null;
    let startX = 0;
    let startY = 0;

    canvas.on("mouse:down", (opt) => {
      isDrawingRef.current = true;
      const pointer = canvas.getScenePoint(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      rect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: "transparent",
        stroke: "#000000",
        strokeWidth: 2,
      });

      canvas.add(rect);
    });

    canvas.on("mouse:move", (opt) => {
      if (!isDrawingRef.current || !rect) return;
      const pointer = canvas.getScenePoint(opt.e);

      const width = pointer.x - startX;
      const height = pointer.y - startY;

      rect.set({
        width: Math.abs(width),
        height: Math.abs(height),
        left: width < 0 ? pointer.x : startX,
        top: height < 0 ? pointer.y : startY,
      });

      canvas.requestRenderAll();
    });

    canvas.on("mouse:up", () => {
      isDrawingRef.current = false;
      rect = null;
    });
  };

  const handleCircleTool = () => {
    if (!canvas) return;
    canvas.selection = false;

    let circle: fabric.Circle | null = null;
    let startX = 0;
    let startY = 0;

    canvas.on("mouse:down", (opt) => {
      isDrawingRef.current = true;
      const pointer = canvas.getScenePoint(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      circle = new fabric.Circle({
        left: startX,
        top: startY,
        radius: 0,
        fill: "transparent",
        stroke: "#000000",
        strokeWidth: 2,
      });

      canvas.add(circle);
    });

    canvas.on("mouse:move", (opt) => {
      if (!isDrawingRef.current || !circle) return;
      const pointer = canvas.getScenePoint(opt.e);

      const dx = pointer.x - startX;
      const dy = pointer.y - startY;
      const radius = Math.sqrt(dx * dx + dy * dy) / 2;

      circle.set({
        radius: radius,
        left: startX,
        top: startY,
        originX: "center",
        originY: "center",
      });

      canvas.requestRenderAll();
    });

    canvas.on("mouse:up", () => {
      isDrawingRef.current = false;
      circle = null;
    });
  };

  const handleTriangleTool = () => {
    if (!canvas) return;
    canvas.selection = false;

    let triangle: fabric.Triangle | null = null;
    let startX = 0;
    let startY = 0;

    canvas.on("mouse:down", (opt) => {
      isDrawingRef.current = true;
      const pointer = canvas.getScenePoint(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      triangle = new fabric.Triangle({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: "transparent",
        stroke: "#000000",
        strokeWidth: 2,
      });

      canvas.add(triangle);
    });

    canvas.on("mouse:move", (opt) => {
      if (!isDrawingRef.current || !triangle) return;
      const pointer = canvas.getScenePoint(opt.e);

      const width = Math.abs(pointer.x - startX);
      const height = Math.abs(pointer.y - startY);

      triangle.set({
        width: width,
        height: height,
        left: pointer.x < startX ? pointer.x : startX,
        top: pointer.y < startX ? pointer.y : startY,
      });

      canvas.requestRenderAll();
    });

    canvas.on("mouse:up", () => {
      isDrawingRef.current = false;
      triangle = null;
    });
  };

  const handleImageUpload = () => {
    fileRef.current?.click();
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      fabric.FabricImage.fromURL(imageUrl).then((img) => {
        img.scale(0.5);
        canvas.add(img);
        canvas.requestRenderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!canvas) return;

    // Reset canvas state
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.forEachObject((obj) => {
      obj.selectable = true;
    });

    // Remove all event listeners
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    switch (activeTool) {
      case "select":
        handleSelectTool();
        break;
      case "move":
        handleMoveTool();
        break;
      case "pen":
        handlePenTool();
        break;
      case "brush":
        handleBrushTool();
        break;
      case "eraser":
        handleEraserTool();
        break;
      case "square":
        handleSquareTool();
        break;
      case "circle":
        handleCircleTool();
        break;
      case "triangle":
        handleTriangleTool();
        break;
    }
  }, [activeTool, canvas]);

  return (
    <div {...props} className={cn(props.className, "grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]")}>
      {/* Menu */}
      <Menubar className={"col-span-2 rounded-none border-b bg-sidebar"}>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <span>New</span>
              <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <span>Open</span>
              <MenubarShortcut>⌘O</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <span>Save</span>
              <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <span>Save As</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Back to Dashboard</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <span>Undo</span>
              <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <span>Redo</span>
              <MenubarShortcut>⌘Y</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <span>Cut</span>
              <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <span>Copy</span>
              <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <span>Paste</span>
              <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <span>Delete</span>
              <MenubarShortcut>Del</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* Tools */}
      <div className={"border-r p-1 flex flex-col gap-1 shadow bg-background"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "select" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("select")}
            >
              <MousePointer2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Select</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "move" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("move")}
            >
              <MoveIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Move</TooltipContent>
        </Tooltip>
        <Separator />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "pen" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("pen")}
            >
              <PenIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Pen</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "brush" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("brush")}
            >
              <BrushIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Brush</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "eraser" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("eraser")}
            >
              <EraserIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Eraser</TooltipContent>
        </Tooltip>
        <Separator />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "square" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("square")}
            >
              <SquareIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Square</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "circle" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("circle")}
            >
              <CircleIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Circle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "triangle" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => setActiveTool("triangle")}
            >
              <TriangleIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Triangle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === "image" ? "default" : "ghost"}
              size={"icon"}
              onClick={() => handleImageUpload()}
            >
              <ImageIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Image</TooltipContent>
        </Tooltip>
      </div>

      {/* Canvas */}
      <div className={"grid place-items-center"}>
        <canvas ref={canvasRef} className={"border rounded-lg shadow"}></canvas>
        <input ref={fileRef} type={"file"} accept={"image/*"} className={"hidden"} onChange={handleImageSelected} />
      </div>
    </div>
  );
}
