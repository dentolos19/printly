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
import { cn } from "@/lib/utils";
import { Book, ChevronDown, FileDown, Home, Info, Keyboard, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { SaveIndicator } from "../../shared/components/save-indicator";
import { useImprinter } from "./hooks/use-imprinter";

type ToolbarHeaderProps = {
  className?: string;
  title?: string;
};

export function ToolbarHeader({ className, title = "Printly Imprinter" }: ToolbarHeaderProps) {
  const router = useRouter();
  const { imprintName, setImprintName, saveStatus, isDirty, lastSavedAt, saveImprint, exportRender, resetCamera } =
    useImprinter();

  return (
    <header className={cn("bg-background flex h-12 items-center justify-between border-b px-4", className)}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/library?tab=imprints")} className="h-8 w-8">
          <Home className="h-4 w-4" />
        </Button>

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

      <div className="flex flex-1 items-center justify-end gap-2">
        <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} />
      </div>

      <div className="flex items-center justify-end pl-4">
        <Input
          value={imprintName}
          onChange={(e) => setImprintName(e.target.value)}
          className={"h-7 w-48 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"}
          placeholder="Untitled Imprint"
        />
      </div>
    </header>
  );
}
