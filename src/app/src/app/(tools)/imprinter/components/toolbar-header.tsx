"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Book,
  ChevronDown,
  Cloud,
  Eye,
  FileDown,
  Home,
  Info,
  Keyboard,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useImprinter } from "./hooks/use-imprinter";

type ToolbarHeaderProps = {
  className?: string;
  title?: string;
};

export function ToolbarHeader({ className, title = "Printly Imprinter" }: ToolbarHeaderProps) {
  const router = useRouter();
  const { imprintName, saveStatus, isDirty, lastSavedAt, saveImprint, exportRender, resetCamera } = useImprinter();

  const saveStatusIcon = {
    idle: null,
    saving: <Loader2 className="h-3 w-3 animate-spin" />,
    saved: <Cloud className="h-3 w-3" />,
    error: <AlertTriangle className="text-destructive h-3 w-3" />,
  };

  const saveStatusText = {
    idle: "Not saved",
    saving: "Saving...",
    saved: lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : "Saved",
    error: "Error saving",
  };

  return (
    <header className={cn("bg-background flex h-12 items-center justify-between border-b px-4", className)}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/library?tab=imprints")} className="h-8 w-8">
          <Home className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              File
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => saveImprint()}>
              <Save className="mr-2 h-4 w-4" />
              Save
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportRender(1920)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Render
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              View
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={resetCamera}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Camera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              Help
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <Keyboard className="mr-2 h-4 w-4" />
              Keyboard Shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Book className="mr-2 h-4 w-4" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Info className="mr-2 h-4 w-4" />
              About
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <Input
          value={imprintName}
          onChange={(e) => {}}
          className="h-8 w-64 text-center"
          placeholder="Untitled Imprint"
        />
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              {saveStatusIcon[saveStatus]}
              <span>{saveStatusText[saveStatus]}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{isDirty ? "Unsaved changes" : "All changes saved"}</TooltipContent>
        </Tooltip>

        <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={() => {}}>
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </div>
    </header>
  );
}

function Separator({ orientation, className }: { orientation: "vertical" | "horizontal"; className?: string }) {
  return <div className={cn("bg-border", orientation === "vertical" ? "w-px" : "h-px", className)} />;
}
