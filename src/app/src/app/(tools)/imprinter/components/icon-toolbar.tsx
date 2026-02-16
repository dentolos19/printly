"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Crosshair, Image, Shirt, Sparkles, Type } from "lucide-react";
import { useImprinter } from "./hooks/use-imprinter";

const PANEL_TOOLS: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: "designs" | "assets" | "templates" | "products";
}[] = [
  { icon: Shirt, label: "Products", view: "products" },
  { icon: Sparkles, label: "Designs", view: "designs" },
  { icon: Image, label: "Assets", view: "assets" },
];

type IconToolbarProps = {
  className?: string;
};

export function IconToolbar({ className }: IconToolbarProps) {
  const { leftPanelView, setLeftPanelView, activeTool, setActiveTool, placementMode, setPlacementMode } =
    useImprinter();

  function handlePanelToggle(view: "designs" | "assets" | "templates" | "products") {
    setLeftPanelView(leftPanelView === view ? null : view);
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
      {PANEL_TOOLS.map(renderPanelButton)}

      <div className="bg-border my-1 h-px w-8" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-10 w-10 rounded-md", activeTool === "place" && "bg-accent text-accent-foreground")}
            onClick={() => {
              setActiveTool(activeTool === "place" ? "select" : "place");
              if (activeTool !== "place") setPlacementMode("free");
            }}
          >
            <Crosshair className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span>Free Place (click on model)</span>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-10 w-10 rounded-md", activeTool === "text" && "bg-accent text-accent-foreground")}
            onClick={() => setActiveTool(activeTool === "text" ? "select" : "text")}
          >
            <Type className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span>Add Text</span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
