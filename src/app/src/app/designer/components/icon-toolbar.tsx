"use client";

import { useDesigner } from "@/app/designer/components/hooks";
import { ToolType } from "@/app/designer/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Circle,
  Image,
  Minus,
  MousePointer2,
  PenTool,
  Shapes,
  Smile,
  Sparkles,
  Square,
  Triangle,
  Type,
} from "lucide-react";

type ToolItem = {
  id: ToolType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
};

const TOOLS: ToolItem[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "Alt+V" },
  { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "Alt+R" },
  { id: "circle", icon: Circle, label: "Circle", shortcut: "Alt+C" },
  { id: "triangle", icon: Triangle, label: "Triangle", shortcut: "Alt+T" },
  { id: "line", icon: Minus, label: "Line", shortcut: "Alt+L" },
  { id: "text", icon: Type, label: "Text", shortcut: "Alt+X" },
];

const SECONDARY_TOOLS: ToolItem[] = [
  { id: "shapes", icon: Shapes, label: "Shapes", shortcut: "Alt+S" },
  { id: "stickers", icon: Smile, label: "Stickers", shortcut: "Alt+K" },
  { id: "image", icon: Image, label: "Image", shortcut: "Alt+I" },
  { id: "ai-generator", icon: Sparkles, label: "AI Generator", shortcut: "Alt+A" },
];

const UTILITY_TOOLS: ToolItem[] = [{ id: "draw", icon: PenTool, label: "Draw", shortcut: "Alt+P" }];

type IconToolbarProps = {
  className?: string;
};

export function IconToolbar({ className }: IconToolbarProps) {
  const { activeTool, setActiveTool, addRectangle, addCircle, addTriangle, addLine, addText, setDrawingMode } =
    useDesigner();

  function handleToolClick(tool: ToolType) {
    if (tool === "draw") {
      setActiveTool(tool);
      setDrawingMode(true);
      return;
    }

    if (activeTool === "draw") {
      setDrawingMode(false);
    }

    setActiveTool(tool);

    switch (tool) {
      case "rectangle":
        addRectangle();
        setActiveTool("select");
        break;
      case "circle":
        addCircle();
        setActiveTool("select");
        break;
      case "triangle":
        addTriangle();
        setActiveTool("select");
        break;
      case "line":
        addLine();
        setActiveTool("select");
        break;
      case "text":
        addText();
        setActiveTool("select");
        break;
    }
  }

  function renderToolButton(tool: ToolItem) {
    const Icon = tool.icon;
    const isActive = activeTool === tool.id;

    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <Button
            type={"button"}
            variant={isActive ? "secondary" : "ghost"}
            size={"icon"}
            className={cn("h-10 w-10", isActive && "bg-accent")}
            onClick={() => handleToolClick(tool.id)}
          >
            <Icon className={"h-5 w-5"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={"right"}>
          <p>
            {tool.label}
            {tool.shortcut && <span className={"text-muted-foreground ml-2"}>({tool.shortcut})</span>}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn("bg-background flex w-12 flex-col items-center border-r py-2", className)}>
      {/* Primary tools */}
      <div className={"flex flex-col items-center gap-1"}>{TOOLS.map(renderToolButton)}</div>

      <Separator className={"my-2 w-8"} />

      {/* Secondary tools */}
      <div className={"flex flex-col items-center gap-1"}>{SECONDARY_TOOLS.map(renderToolButton)}</div>

      <Separator className={"my-2 w-8"} />

      {/* Utility tools */}
      <div className={"flex flex-col items-center gap-1"}>{UTILITY_TOOLS.map(renderToolButton)}</div>
    </div>
  );
}
