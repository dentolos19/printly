/**
 * @deprecated This component is no longer used. The designer is now integrated directly into the page.
 * Please use the designer page at /designer/[id] instead.
 * This file is kept for reference only.
 */

"use client";

import { IconToolbar } from "@/app/(tools)/designer/components/icon-toolbar";
import { ArtStyle } from "@/app/(tools)/designer/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DesignerCanvas } from "./canvas";
import { DesignerProvider, useKeyboardShortcuts } from "./hooks";
import { LeftPanel, RightPanel } from "./panels";
import { StatusBar } from "./status-bar";
import { ToolbarHeader } from "./toolbar-header";

type DesignerProps = {
  className?: string;
  designId?: string | null;
  designName?: string;
  onSave?: (data: { name: string; data: string }) => Promise<{ id: string }>;
  onLoad?: (id: string) => Promise<{ name: string; data: string }>;
  onGenerateImage?: (prompt: string, style?: ArtStyle) => Promise<{ url: string; assetId: string }>;
};

function DesignerContent({ className }: { className?: string }) {
  useKeyboardShortcuts();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Top toolbar/menu bar */}
      <ToolbarHeader />

      {/* Main content area */}
      <div className={"flex flex-1 overflow-hidden"}>
        {/* Left icon toolbar */}
        <IconToolbar />

        {/* Left expandable panel */}
        <LeftPanel />

        {/* Main canvas area */}
        <DesignerCanvas />

        {/* Right properties panel */}
        <RightPanel />
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  );
}

export function Designer({
  className,
  designId,
  designName = "Untitled Design",
  onSave,
  onLoad,
  onGenerateImage,
}: DesignerProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <DesignerProvider
        initialDesignId={designId}
        initialDesignName={designName}
        onSave={onSave}
        onLoad={onLoad}
        onGenerateImage={onGenerateImage}
      >
        <DesignerContent className={className} />
      </DesignerProvider>
    </TooltipProvider>
  );
}

export default Designer;
