"use client";

import { useEffect } from "react";
import { useDesigner } from "./use-designer";

export function useKeyboardShortcuts() {
  const {
    canvas,
    canUndo,
    canRedo,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    saveDesign,
  } = useDesigner();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore shortcuts when typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Undo: Ctrl+Z
      if (isCtrlOrMeta && !isShift && e.key === "z") {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (isCtrlOrMeta && ((isShift && e.key === "z") || e.key === "y")) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Save: Ctrl+S
      if (isCtrlOrMeta && e.key === "s") {
        e.preventDefault();
        saveDesign();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Duplicate: Ctrl+D
      if (isCtrlOrMeta && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Group: Ctrl+G
      if (isCtrlOrMeta && !isShift && e.key === "g") {
        e.preventDefault();
        groupSelected();
        return;
      }

      // Ungroup: Ctrl+Shift+G
      if (isCtrlOrMeta && isShift && e.key === "g") {
        e.preventDefault();
        ungroupSelected();
        return;
      }

      // Select All: Ctrl+A
      if (isCtrlOrMeta && e.key === "a") {
        e.preventDefault();
        if (canvas) {
          const objects = canvas.getObjects();
          if (objects.length > 0) {
            canvas.discardActiveObject();
            const selection = new (require("fabric").ActiveSelection)(objects, { canvas });
            canvas.setActiveObject(selection);
            canvas.renderAll();
          }
        }
        return;
      }

      // Deselect: Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (canvas) {
          canvas.discardActiveObject();
          canvas.renderAll();
        }
        return;
      }

      // Move with arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        e.preventDefault();
        const step = isShift ? 10 : 1;

        switch (e.key) {
          case "ArrowUp":
            activeObject.set({ top: (activeObject.top || 0) - step });
            break;
          case "ArrowDown":
            activeObject.set({ top: (activeObject.top || 0) + step });
            break;
          case "ArrowLeft":
            activeObject.set({ left: (activeObject.left || 0) - step });
            break;
          case "ArrowRight":
            activeObject.set({ left: (activeObject.left || 0) + step });
            break;
        }

        activeObject.setCoords();
        canvas.renderAll();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canvas,
    canUndo,
    canRedo,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    saveDesign,
  ]);
}
