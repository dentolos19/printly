"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DesignerCanvas } from "./canvas";
import { DesignerProvider } from "./hooks/use-designer";
import { useKeyboardShortcuts } from "./hooks/use-keyboard";
import { DesignerSidebar } from "./sidebar";
import { DesignerToolbar } from "./toolbar";

type DesignerProps = {
  className?: string;
};

const DesignerContent = ({ className }: DesignerProps) => {
  useKeyboardShortcuts();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <DesignerToolbar />

      <ResizablePanelGroup direction={"horizontal"} className={"flex-1"}>
        <ResizablePanel defaultSize={75} minSize={50}>
          <DesignerCanvas className={"h-full"} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <DesignerSidebar />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export const Designer = ({ className }: DesignerProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <DesignerProvider>
        <DesignerContent className={className} />
      </DesignerProvider>
    </TooltipProvider>
  );
};

export default Designer;
