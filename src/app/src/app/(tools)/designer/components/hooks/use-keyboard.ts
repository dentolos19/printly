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
    copySelected,
    cutSelected,
    paste,
    selectAll,
    deselectAll,
    saveDesign,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    setActiveTool,
    addRectangle,
    addCircle,
    addTriangle,
    addLine,
    addText,
    setDrawingMode,
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
      const isAlt = e.altKey;

      // Tool shortcuts with Alt modifier
      // Select: Alt+V
      if (isAlt && e.key === "v") {
        e.preventDefault();
        setActiveTool("select");
        return;
      }

      // Rectangle: Alt+R
      if (isAlt && e.key === "r") {
        e.preventDefault();
        addRectangle();
        setActiveTool("select");
        return;
      }

      // Circle: Alt+C
      if (isAlt && e.key === "c") {
        e.preventDefault();
        addCircle();
        setActiveTool("select");
        return;
      }

      // Triangle: Alt+T
      if (isAlt && e.key === "t") {
        e.preventDefault();
        addTriangle();
        setActiveTool("select");
        return;
      }

      // Line: Alt+L
      if (isAlt && e.key === "l") {
        e.preventDefault();
        addLine();
        setActiveTool("select");
        return;
      }

      // Text: Alt+T (conflicts with triangle, so using Alt+X for text)
      if (isAlt && e.key === "x") {
        e.preventDefault();
        addText();
        setActiveTool("select");
        return;
      }

      // Draw: Alt+P
      if (isAlt && e.key === "p") {
        e.preventDefault();
        setActiveTool("draw");
        setDrawingMode(true);
        return;
      }

      // Shapes: Alt+S
      if (isAlt && e.key === "s") {
        e.preventDefault();
        setActiveTool("shapes");
        return;
      }

      // Stickers: Alt+K
      if (isAlt && e.key === "k") {
        e.preventDefault();
        setActiveTool("stickers");
        return;
      }

      // Assets: Alt+I
      if (isAlt && e.key === "i") {
        e.preventDefault();
        setActiveTool("assets");
        return;
      }

      // AI Generator: Alt+A
      if (isAlt && e.key === "a") {
        e.preventDefault();
        setActiveTool("ai-generator");
        return;
      }

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

      // Copy: Ctrl+C
      if (isCtrlOrMeta && e.key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }

      // Cut: Ctrl+X
      if (isCtrlOrMeta && e.key === "x") {
        e.preventDefault();
        cutSelected();
        return;
      }

      // Paste: Ctrl+V
      if (isCtrlOrMeta && e.key === "v") {
        e.preventDefault();
        paste();
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

      // Zoom In: Ctrl+=
      if (isCtrlOrMeta && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
        return;
      }

      // Zoom Out: Ctrl+-
      if (isCtrlOrMeta && e.key === "-") {
        e.preventDefault();
        zoomOut();
        return;
      }

      // Reset Zoom: Ctrl+0
      if (isCtrlOrMeta && e.key === "0") {
        e.preventDefault();
        resetZoom();
        return;
      }

      // Fit to Screen: Ctrl+1
      if (isCtrlOrMeta && e.key === "1") {
        e.preventDefault();
        fitToScreen();
        return;
      }

      // Select All: Ctrl+A
      if (isCtrlOrMeta && e.key === "a") {
        e.preventDefault();
        selectAll();
        return;
      }

      // Deselect: Escape
      if (e.key === "Escape") {
        e.preventDefault();
        deselectAll();
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
    copySelected,
    cutSelected,
    paste,
    selectAll,
    deselectAll,
    saveDesign,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    setActiveTool,
    addRectangle,
    addCircle,
    addTriangle,
    addLine,
    addText,
    setDrawingMode,
  ]);
}
