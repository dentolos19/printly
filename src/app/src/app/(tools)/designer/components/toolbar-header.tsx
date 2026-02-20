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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  AlignCenter,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  ChevronDown,
  Clipboard,
  Copy,
  Eye,
  FileDown,
  FilePlus,
  Group,
  Home,
  Maximize,
  Maximize2,
  Redo2,
  Save,
  Scissors,
  Shirt,
  Trash2,
  Undo2,
  Ungroup,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { SaveIndicator } from "../../shared/components/save-indicator";
import { useDesigner } from "./hooks";
import { ResizeDesignDialog } from "./resize-design-dialog";

type ToolbarHeaderProps = {
  className?: string;
  title?: string;
  problemCount?: number;
};

const NAME_DEBOUNCE_MS = 800;

type DebouncedNameInputHandle = {
  flush: () => string;
};

export function ToolbarHeader({ className, title = "Printly", problemCount = 0 }: ToolbarHeaderProps) {
  const router = useRouter();
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const nameInputRef = useRef<DebouncedNameInputHandle | null>(null);
  const {
    designId,
    designName,
    setDesignName,
    triggerAutoSave,
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
    copySelected,
    cutSelected,
    paste,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    alignObjects,
    distributeObjects,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    resizeDesign,
    canvasSize,
  } = useDesigner();

  const handleSaveDesign = useCallback(async () => {
    const latestName = nameInputRef.current?.flush();
    return saveDesign({ force: true, nameOverride: latestName });
  }, [saveDesign]);

  async function handleImprint() {
    try {
      const savedDesignId = await handleSaveDesign();
      const idToUse = savedDesignId || designId;
      if (idToUse) {
        router.push(`/imprinter/new?design=${idToUse}`);
      }
    } catch (error) {
      console.error("Failed to save design before imprinting:", error);
    }
  }

  return (
    <div className={cn("bg-background flex h-12 items-center border-b px-2", className)}>
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type={"button"}
            variant={"ghost"}
            size={"icon"}
            className={"mr-2 h-8 w-8"}
            onClick={() => router.push("/library?tab=designs")}
          >
            <Home className={"h-4 w-4"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Home</TooltipContent>
      </Tooltip>

      {/* Menu Bar */}
      <nav className={"flex items-center gap-1"}>
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type={"button"} variant={"ghost"} size={"sm"} className={"h-7 px-2 text-sm"}>
              File
              <ChevronDown className={"ml-1 h-3 w-3"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"start"}>
            <DropdownMenuItem onClick={() => router.push("/designer")}>
              <FilePlus className={"mr-2 h-4 w-4"} />
              New
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleSaveDesign()}>
              <Save className={"mr-2 h-4 w-4"} />
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResizeDialogOpen(true)}>
              <Maximize className={"mr-2 h-4 w-4"} />
              Resize
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileDown className={"mr-2 h-4 w-4"} />
                Export
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
              <Trash2 className={"mr-2 h-4 w-4"} />
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
            <DropdownMenuItem onClick={cutSelected}>
              <Scissors className={"mr-2 h-4 w-4"} />
              Cut
              <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copySelected}>
              <Copy className={"mr-2 h-4 w-4"} />
              Copy
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={paste}>
              <Clipboard className={"mr-2 h-4 w-4"} />
              Paste
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={duplicateSelected}>
              <Copy className={"mr-2 h-4 w-4"} />
              Duplicate
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deleteSelected}>
              <Trash2 className={"mr-2 h-4 w-4"} />
              Delete
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={groupSelected}>
              <Group className={"mr-2 h-4 w-4"} />
              Group
              <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={ungroupSelected}>
              <Ungroup className={"mr-2 h-4 w-4"} />
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
            <DropdownMenuItem onClick={bringToFront}>
              <ArrowUpToLine className={"mr-2 h-4 w-4"} />
              Bring to Front
            </DropdownMenuItem>
            <DropdownMenuItem onClick={bringForward}>
              <ArrowUp className={"mr-2 h-4 w-4"} />
              Bring Forward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={sendBackward}>
              <ArrowDown className={"mr-2 h-4 w-4"} />
              Send Backward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={sendToBack}>
              <ArrowDownToLine className={"mr-2 h-4 w-4"} />
              Send to Back
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <AlignLeft className={"mr-2 h-4 w-4"} />
                Align
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => alignObjects("left")}>
                  <AlignLeft className={"mr-2 h-4 w-4"} />
                  Align Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("center")}>
                  <AlignCenter className={"mr-2 h-4 w-4"} />
                  Align Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("right")}>
                  <AlignRight className={"mr-2 h-4 w-4"} />
                  Align Right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => alignObjects("top")}>
                  <ArrowUpToLine className={"mr-2 h-4 w-4"} />
                  Align Top
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("middle")}>
                  <AlignCenter className={"mr-2 h-4 w-4"} />
                  Align Middle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignObjects("bottom")}>
                  <ArrowDownToLine className={"mr-2 h-4 w-4"} />
                  Align Bottom
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <AlignHorizontalDistributeCenter className={"mr-2 h-4 w-4"} />
                Distribute
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => distributeObjects("horizontal")}>
                  <AlignHorizontalDistributeCenter className={"mr-2 h-4 w-4"} />
                  Distribute Horizontally
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => distributeObjects("vertical")}>
                  <AlignVerticalDistributeCenter className={"mr-2 h-4 w-4"} />
                  Distribute Vertically
                </DropdownMenuItem>
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
            <DropdownMenuItem onClick={zoomIn}>
              <ZoomIn className={"mr-2 h-4 w-4"} />
              Zoom In
              <DropdownMenuShortcut>⌘+</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={zoomOut}>
              <ZoomOut className={"mr-2 h-4 w-4"} />
              Zoom Out
              <DropdownMenuShortcut>⌘-</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={fitToScreen}>
              <Maximize2 className={"mr-2 h-4 w-4"} />
              Fit to Screen
              <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={resetZoom}>
              <Maximize className={"mr-2 h-4 w-4"} />
              Actual Size
              <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Spacer */}
      <div className={"flex-1"} />

      {/* Save status */}
      <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} />

      {/* Design name (debounced) */}
      <div className={"flex items-center gap-2 pl-4"}>
        <DebouncedNameInput
          ref={nameInputRef}
          value={designName}
          onChange={(name) => {
            setDesignName(name);
            triggerAutoSave();
          }}
          onCommit={(name) => {
            void saveDesign({ force: true, nameOverride: name });
          }}
          placeholder="Untitled Design"
        />
      </div>

      {/* Imprint button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type={"button"}
            variant={"default"}
            size={"sm"}
            className={"ml-2 h-7 gap-1.5 px-3"}
            onClick={handleImprint}
            disabled={saveStatus === "saving"}
          >
            <Shirt className={"h-4 w-4"} />
            Imprint
          </Button>
        </TooltipTrigger>
        <TooltipContent>Apply this design to a product</TooltipContent>
      </Tooltip>

      {/* Problem indicator */}
      {problemCount > 0 && (
        <Button type={"button"} variant={"ghost"} size={"sm"} className={"text-destructive h-7 gap-1"}>
          <AlertTriangle className={"h-4 w-4"} />
          {problemCount} problem{problemCount > 1 ? "s" : ""} found
        </Button>
      )}

      <ResizeDesignDialog
        open={resizeDialogOpen}
        onOpenChange={setResizeDialogOpen}
        currentSize={canvasSize}
        onResize={resizeDesign}
      />
    </div>
  );
}

const DebouncedNameInput = forwardRef<
  DebouncedNameInputHandle,
  {
    value: string;
    onChange: (name: string) => void;
    onCommit?: (name: string) => void;
    placeholder?: string;
  }
>(function DebouncedNameInput({ value, onChange, onCommit, placeholder }, ref) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalValue(value);
    localValueRef.current = value;
  }, [value]);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const latestValue = localValueRef.current;
    onChangeRef.current(latestValue);
    return latestValue;
  }, []);

  useImperativeHandle(ref, () => ({ flush }), [flush]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    localValueRef.current = next;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(next);
      timeoutRef.current = null;
    }, NAME_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      onBlur={() => {
        const latestValue = flush();
        onCommit?.(latestValue);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const latestValue = flush();
          onCommit?.(latestValue);
        }
      }}
      className={"h-7 w-48 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"}
      placeholder={placeholder}
    />
  );
});
