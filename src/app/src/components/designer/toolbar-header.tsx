"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  Cloud,
  Eye,
  FileDown,
  Loader2,
  Printer,
  Redo2,
  Save,
  Share2,
  Undo2,
} from "lucide-react";
import { useDesigner } from "./hooks";

type ToolbarHeaderProps = {
  className?: string;
  title?: string;
  problemCount?: number;
};

export function ToolbarHeader({ className, title = "Printly", problemCount = 0 }: ToolbarHeaderProps) {
  const {
    designName,
    setDesignName,
    saveStatus,
    isDirty,
    lastSavedAt,
    canUndo,
    canRedo,
    undo,
    redo,
    saveDesign,
    exportCanvas,
    clearCanvas,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    alignObjects,
    distributeObjects,
  } = useDesigner();

  function formatLastSaved() {
    if (!lastSavedAt) return null;
    const now = new Date();
    const diff = now.getTime() - lastSavedAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    return lastSavedAt.toLocaleTimeString();
  }

  return (
    <div className={cn("bg-background flex h-12 items-center border-b px-2", className)}>
      {/* Logo/Brand */}
      <div className={"flex items-center gap-2 pr-4"}>
        <span className={"text-primary text-lg font-bold"}>{title}</span>
      </div>

      {/* Design name */}
      <div className={"flex items-center gap-2 border-l pl-4"}>
        <Input
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          className={"h-7 w-48 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"}
        />
      </div>

      {/* Menu Bar */}
      <nav className={"ml-4 flex items-center gap-1"}>
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"sm"} className={"h-7 px-2 text-sm"}>
              File
              <ChevronDown className={"ml-1 h-3 w-3"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"start"}>
            <DropdownMenuItem onClick={() => (window.location.href = "/designer/new")}>
              New Design
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => saveDesign()}>
              <Save className={"mr-2 h-4 w-4"} />
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileDown className={"mr-2 h-4 w-4"} />
                Export as
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => exportCanvas("png")}>PNG Image</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCanvas("jpg")}>JPG Image</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCanvas("svg")}>SVG Vector</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCanvas("json")}>JSON Data</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={"text-destructive"} onClick={clearCanvas}>
              Clear Canvas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"sm"} className={"h-7 px-2 text-sm"}>
              Edit
              <ChevronDown className={"ml-1 h-3 w-3"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"start"}>
            <DropdownMenuItem onClick={undo} disabled={!canUndo}>
              <Undo2 className={"mr-2 h-4 w-4"} />
              Undo
              <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={redo} disabled={!canRedo}>
              <Redo2 className={"mr-2 h-4 w-4"} />
              Redo
              <DropdownMenuShortcut>⌘⇧Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={duplicateSelected}>
              Duplicate
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deleteSelected}>
              Delete
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={groupSelected}>
              Group
              <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={ungroupSelected}>
              Ungroup
              <DropdownMenuShortcut>⌘⇧G</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Layer Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"sm"} className={"h-7 px-2 text-sm"}>
              Layer
              <ChevronDown className={"ml-1 h-3 w-3"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"start"}>
            <DropdownMenuItem onClick={bringToFront}>Bring to Front</DropdownMenuItem>
            <DropdownMenuItem onClick={bringForward}>Bring Forward</DropdownMenuItem>
            <DropdownMenuItem onClick={sendBackward}>Send Backward</DropdownMenuItem>
            <DropdownMenuItem onClick={sendToBack}>Send to Back</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Align</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => alignObjects("left")}>Align Left</DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("center")}>Align Center</DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("right")}>Align Right</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => alignObjects("top")}>Align Top</DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("middle")}>Align Middle</DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("bottom")}>Align Bottom</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Distribute</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => distributeObjects("horizontal")}>
                  Distribute Horizontally
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => distributeObjects("vertical")}>Distribute Vertically</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"sm"} className={"h-7 px-2 text-sm"}>
              View
              <ChevronDown className={"ml-1 h-3 w-3"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"start"}>
            <DropdownMenuItem>
              <Eye className={"mr-2 h-4 w-4"} />
              Preview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Zoom In</DropdownMenuItem>
            <DropdownMenuItem>Zoom Out</DropdownMenuItem>
            <DropdownMenuItem>Fit to Screen</DropdownMenuItem>
            <DropdownMenuItem>Actual Size</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"sm"} className={"h-7 px-2 text-sm"}>
              Help
              <ChevronDown className={"ml-1 h-3 w-3"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"start"}>
            <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
            <DropdownMenuItem>Documentation</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>About</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Spacer */}
      <div className={"flex-1"} />

      {/* Save status */}
      <div className={"text-muted-foreground flex items-center gap-2 text-xs"}>
        {saveStatus === "saving" && (
          <>
            <Loader2 className={"h-3 w-3 animate-spin"} />
            <span>Saving...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Cloud className={"h-3 w-3 text-green-600"} />
            <span>Saved {formatLastSaved()}</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertTriangle className={"text-destructive h-3 w-3"} />
            <span className={"text-destructive"}>Save failed</span>
          </>
        )}
        {isDirty && saveStatus !== "saving" && <span className={"text-amber-600"}>Unsaved changes</span>}
      </div>

      <Separator orientation={"vertical"} className={"mx-3 h-6"} />

      {/* Problem indicator */}
      {problemCount > 0 && (
        <Button type={"button"} variant={"ghost"} size={"sm"} className={"text-destructive h-7 gap-1"}>
          <AlertTriangle className={"h-4 w-4"} />
          {problemCount} problem{problemCount > 1 ? "s" : ""} found
        </Button>
      )}

      {/* Action buttons */}
      <div className={"flex items-center gap-2"}>
        <Button type={"button"} variant={"outline"} size={"sm"} className={"h-8 gap-2"}>
          <Eye className={"h-4 w-4"} />
          Preview
        </Button>
        <Button type={"button"} variant={"outline"} size={"sm"} className={"h-8 gap-2"}>
          <Share2 className={"h-4 w-4"} />
          Share
        </Button>
        <Button type={"button"} size={"sm"} className={"h-8 gap-2"}>
          <Printer className={"h-4 w-4"} />
          Print
        </Button>
      </div>
    </div>
  );
}
