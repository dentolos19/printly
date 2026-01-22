"use client";

import { Tool } from "@/app/(tools)/imprinter/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Image, MousePointer2, Move, Palette, RotateCw, Scale, Sparkles } from "lucide-react";
import { useImprinter } from "./hooks/use-imprinter";

type ToolItem = {
  id: Tool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
};

const PRIMARY_TOOLS: ToolItem[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "move", icon: Move, label: "Move", shortcut: "M" },
  { id: "rotate", icon: RotateCw, label: "Rotate", shortcut: "R" },
  { id: "scale", icon: Scale, label: "Scale", shortcut: "S" },
];

const SECONDARY_TOOLS: ToolItem[] = [{ id: "color-picker", icon: Palette, label: "Product Color", shortcut: "C" }];

const PANEL_TOOLS: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: "designs" | "assets" | "templates";
}[] = [
  { icon: Sparkles, label: "Designs", view: "designs" },
  { icon: Image, label: "Assets", view: "assets" },
];

type IconToolbarProps = {
  className?: string;
};

export function IconToolbar({ className }: IconToolbarProps) {
  const { activeTool, setActiveTool, leftPanelView, setLeftPanelView } = useImprinter();

  function handleToolClick(tool: Tool) {
    setActiveTool(tool);
  }

  function handlePanelToggle(view: "designs" | "assets" | "templates") {
    setLeftPanelView(leftPanelView === view ? null : view);
  }

  function renderToolButton(tool: ToolItem) {
    const Icon = tool.icon;
    const isActive = activeTool === tool.id;

    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-10 w-10 rounded-md", isActive && "bg-accent text-accent-foreground")}
            onClick={() => handleToolClick(tool.id)}
          >
            <Icon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex flex-col items-start">
            <span>{tool.label}</span>
            {tool.shortcut && <span className="text-muted-foreground text-xs">{tool.shortcut}</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  function renderPanelButton(item: (typeof PANEL_TOOLS)[0]) {
    const Icon = item.icon;
    const isActive = leftPanelView === item.view;

    return (
      <Tooltip key={item.view}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-10 w-10 rounded-md", isActive && "bg-accent text-accent-foreground")}
            onClick={() => handlePanelToggle(item.view)}
          >
            <Icon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span>{item.label}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn("bg-background flex w-14 flex-col items-center gap-1 border-r py-2", className)}>
      {PRIMARY_TOOLS.map(renderToolButton)}

      <Separator className="my-2 w-8" />

      {SECONDARY_TOOLS.map(renderToolButton)}

      <Separator className="my-2 w-8" />

      {PANEL_TOOLS.map(renderPanelButton)}
    </div>
  );
}
