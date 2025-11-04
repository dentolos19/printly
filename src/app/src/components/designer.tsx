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
  ImageIcon,
  MousePointer2Icon,
  MoveIcon,
  PenIcon,
  SquareIcon,
  TriangleIcon,
  WandSparkles,
} from "lucide-react";
import { ComponentProps, useEffect, useRef, useState } from "react";

export default function Designer(props: ComponentProps<"div">) {
  const canvasRef = useRef(null);

  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

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
    <div {...props} className={cn(props.className, "grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]")}>
      {/* Menu */}
      <Menubar className={"col-span-2 rounded-none border-b"}>
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
            <Button variant={"ghost"} size={"icon"}>
              <MousePointer2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Select</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <MoveIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Move</TooltipContent>
        </Tooltip>
        <Separator />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <PenIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Pen</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <BrushIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Brush</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <WandSparkles />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Magic</TooltipContent>
        </Tooltip>
        <Separator />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <SquareIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Square</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <CircleIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Circle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <TriangleIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Triangle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size={"icon"}>
              <ImageIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>Image</TooltipContent>
        </Tooltip>
      </div>

      {/* Canvas */}
      <div className={"grid place-items-center"}>
        <canvas ref={canvasRef} className={"border rounded-lg shadow"}></canvas>
      </div>
    </div>
  );
}