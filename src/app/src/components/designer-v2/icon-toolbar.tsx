"use client";

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
import { useDesigner } from "./hooks";
import type { ToolType } from "./types";

type ToolItem = {
  id: ToolType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
};

const TOOLS: ToolItem[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "circle", icon: Circle, label: "Circle", shortcut: "C" },
  { id: "triangle", icon: Triangle, label: "Triangle" },
  { id: "line", icon: Minus, label: "Line", shortcut: "L" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
];

const SECONDARY_TOOLS: ToolItem[] = [
  { id: "shapes", icon: Shapes, label: "Shapes" },
  { id: "stickers", icon: Smile, label: "Stickers" },
  { id: "image", icon: Image, label: "Image" },
];

const UTILITY_TOOLS: ToolItem[] = [{ id: "draw", icon: PenTool, label: "Draw", shortcut: "P" }];

type IconToolbarProps = {
  className?: string;
};

export function IconToolbar({ className }: IconToolbarProps) {
  const { activeTool, setActiveTool, addRectangle, addCircle, addTriangle, addLine, addText } = useDesigner();

  function handleToolClick(tool: ToolType) {
    setActiveTool(tool);

    // Auto-add shape when tool is clicked
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

      {/* Spacer */}
      <div className={"flex-1"} />

      {/* Bottom tools */}
      <div className={"flex flex-col items-center gap-1"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type={"button"}
              variant={activeTool === "ai-generator" ? "secondary" : "ghost"}
              size={"icon"}
              className={cn("h-10 w-10", activeTool === "ai-generator" && "bg-accent")}
              onClick={() => setActiveTool("ai-generator")}
            >
              <Sparkles className={"h-5 w-5"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"right"}>
            <p>AI Generator</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
