"use client";

import { useImprinter } from "./hooks/use-imprinter";
import { IconToolbar } from "./icon-toolbar";
import { LeftPanel } from "./panels/left-panel";
import { RightPanel } from "./panels/right-panel";
import { ImprinterScene } from "./scene";
import { ToolbarHeader } from "./toolbar-header";

export function ImprinterContent() {
  const { leftPanelView, rightPanelOpen } = useImprinter();

  return (
    <div className="bg-background flex h-screen flex-col">
      <ToolbarHeader />
      <div className="relative flex flex-1 overflow-hidden">
        <IconToolbar />
        {leftPanelView && <LeftPanel />}
        <div className="relative flex-1">
          <ImprinterScene />
        </div>
        {rightPanelOpen && <RightPanel />}
      </div>
    </div>
  );
}
