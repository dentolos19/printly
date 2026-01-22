"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlignCenter,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Clipboard,
  Copy,
  Group,
  Scissors,
  Trash2,
  Ungroup,
} from "lucide-react";
import type { ReactNode } from "react";
import { useDesigner } from "./hooks";

type CanvasContextMenuProps = {
  children: ReactNode;
};

export function CanvasContextMenu({ children }: CanvasContextMenuProps) {
  const {
    selectedObjects,
    copySelected,
    cutSelected,
    paste,
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

  const hasSelection = selectedObjects.length > 0;
  const hasMultipleSelection = selectedObjects.length > 1;
  const canGroup = selectedObjects.length > 1;
  const canUngroup = selectedObjects.length === 1 && selectedObjects[0]?.type === "group";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={"w-56"}>
        <ContextMenuItem onClick={cutSelected} disabled={!hasSelection}>
          <Scissors className={"mr-2 h-4 w-4"} />
          Cut
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={copySelected} disabled={!hasSelection}>
          <Copy className={"mr-2 h-4 w-4"} />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={paste}>
          <Clipboard className={"mr-2 h-4 w-4"} />
          Paste
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={duplicateSelected} disabled={!hasSelection}>
          <Copy className={"mr-2 h-4 w-4"} />
          Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={deleteSelected} disabled={!hasSelection}>
          <Trash2 className={"mr-2 h-4 w-4"} />
          Delete
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={groupSelected} disabled={!canGroup}>
          <Group className={"mr-2 h-4 w-4"} />
          Group
          <ContextMenuShortcut>⌘G</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={ungroupSelected} disabled={!canUngroup}>
          <Ungroup className={"mr-2 h-4 w-4"} />
          Ungroup
          <ContextMenuShortcut>⌘⇧G</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        {hasSelection && (
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={!hasSelection}>
              <ArrowUp className={"mr-2 h-4 w-4"} />
              Layer
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={bringToFront}>
                <ArrowUpToLine className={"mr-2 h-4 w-4"} />
                Bring to Front
              </ContextMenuItem>
              <ContextMenuItem onClick={bringForward}>
                <ArrowUp className={"mr-2 h-4 w-4"} />
                Bring Forward
              </ContextMenuItem>
              <ContextMenuItem onClick={sendBackward}>
                <ArrowDown className={"mr-2 h-4 w-4"} />
                Send Backward
              </ContextMenuItem>
              <ContextMenuItem onClick={sendToBack}>
                <ArrowDownToLine className={"mr-2 h-4 w-4"} />
                Send to Back
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {hasMultipleSelection && (
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={!hasMultipleSelection}>
              <AlignCenter className={"mr-2 h-4 w-4"} />
              Align
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => alignObjects("left")}>
                <AlignLeft className={"mr-2 h-4 w-4"} />
                Align Left
              </ContextMenuItem>
              <ContextMenuItem onClick={() => alignObjects("center")}>
                <AlignCenter className={"mr-2 h-4 w-4"} />
                Align Center
              </ContextMenuItem>
              <ContextMenuItem onClick={() => alignObjects("right")}>
                <AlignRight className={"mr-2 h-4 w-4"} />
                Align Right
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => alignObjects("top")}>
                <ArrowUpToLine className={"mr-2 h-4 w-4"} />
                Align Top
              </ContextMenuItem>
              <ContextMenuItem onClick={() => alignObjects("middle")}>
                <AlignCenter className={"mr-2 h-4 w-4"} />
                Align Middle
              </ContextMenuItem>
              <ContextMenuItem onClick={() => alignObjects("bottom")}>
                <ArrowDownToLine className={"mr-2 h-4 w-4"} />
                Align Bottom
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {selectedObjects.length >= 3 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={selectedObjects.length < 3}>
              <AlignHorizontalDistributeCenter className={"mr-2 h-4 w-4"} />
              Distribute
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => distributeObjects("horizontal")}>
                <AlignHorizontalDistributeCenter className={"mr-2 h-4 w-4"} />
                Distribute Horizontally
              </ContextMenuItem>
              <ContextMenuItem onClick={() => distributeObjects("vertical")}>
                <AlignVerticalDistributeCenter className={"mr-2 h-4 w-4"} />
                Distribute Vertically
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
