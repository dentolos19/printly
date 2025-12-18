"use client";

import { useCallback, useEffect } from "react";
import { useDesigner } from "./use-designer";

export const useKeyboardShortcuts = () => {
  const {
    canvas,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    canUndo,
    canRedo,
    selectedObjects,
  } = useDesigner();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canvas) return;

      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInputFocused) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (isCtrlOrCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((isCtrlOrCmd && e.key === "z" && e.shiftKey) || (isCtrlOrCmd && e.key === "y")) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Duplicate: Ctrl+D
      if (isCtrlOrCmd && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Group: Ctrl+G
      if (isCtrlOrCmd && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        groupSelected();
        return;
      }

      // Ungroup: Ctrl+Shift+G
      if (isCtrlOrCmd && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        ungroupSelected();
        return;
      }

      // Select All: Ctrl+A
      if (isCtrlOrCmd && e.key === "a") {
        e.preventDefault();
        canvas.discardActiveObject();
        const objects = canvas.getObjects();
        if (objects.length > 0) {
          const { ActiveSelection } = require("fabric");
          const selection = new ActiveSelection(objects, { canvas });
          canvas.setActiveObject(selection);
          canvas.renderAll();
        }
        return;
      }

      // Escape: Deselect
      if (e.key === "Escape") {
        e.preventDefault();
        canvas.discardActiveObject();
        canvas.renderAll();
        return;
      }

      // Arrow keys: Move selected objects
      if (selectedObjects.length > 0) {
        const step = e.shiftKey ? 10 : 1;

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            for (const obj of selectedObjects) {
              obj.set({ top: (obj.top || 0) - step });
            }
            canvas.renderAll();
            break;
          case "ArrowDown":
            e.preventDefault();
            for (const obj of selectedObjects) {
              obj.set({ top: (obj.top || 0) + step });
            }
            canvas.renderAll();
            break;
          case "ArrowLeft":
            e.preventDefault();
            for (const obj of selectedObjects) {
              obj.set({ left: (obj.left || 0) - step });
            }
            canvas.renderAll();
            break;
          case "ArrowRight":
            e.preventDefault();
            for (const obj of selectedObjects) {
              obj.set({ left: (obj.left || 0) + step });
            }
            canvas.renderAll();
            break;
        }
      }
    },
    [
      canvas,
      undo,
      redo,
      deleteSelected,
      duplicateSelected,
      groupSelected,
      ungroupSelected,
      canUndo,
      canRedo,
      selectedObjects,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};
