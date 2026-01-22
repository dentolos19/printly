"use client";

import { useEffect } from "react";
import { useImprinter } from "./use-imprinter";

export function useKeyboardShortcuts() {
  const {
    selectedDesignId,
    removeDesign,
    selectDesign,
    saveImprint,
    resetCamera,
    setActiveTool,
    setLeftPanelView,
    setRightPanelOpen,
    setActivePrintArea,
    rightPanelOpen,
    leftPanelView,
  } = useImprinter();

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

      // Move: Alt+M
      if (isAlt && e.key === "m") {
        e.preventDefault();
        setActiveTool("move");
        return;
      }

      // Rotate: Alt+R
      if (isAlt && e.key === "r") {
        e.preventDefault();
        setActiveTool("rotate");
        return;
      }

      // Scale: Alt+S
      if (isAlt && e.key === "s") {
        e.preventDefault();
        setActiveTool("scale");
        return;
      }

      // Color Picker: Alt+C
      if (isAlt && e.key === "c") {
        e.preventDefault();
        setActiveTool("color-picker");
        return;
      }

      // Panel shortcuts with Alt modifier
      // Designs Panel: Alt+D
      if (isAlt && e.key === "d") {
        e.preventDefault();
        setLeftPanelView("designs");
        return;
      }

      // Assets Panel: Alt+A
      if (isAlt && e.key === "a") {
        e.preventDefault();
        setLeftPanelView("assets");
        return;
      }

      // Templates Panel: Alt+T
      if (isAlt && e.key === "t") {
        e.preventDefault();
        setLeftPanelView("templates");
        return;
      }

      // Toggle Right Panel: Alt+P
      if (isAlt && e.key === "p") {
        e.preventDefault();
        setRightPanelOpen(!rightPanelOpen);
        return;
      }

      // Print area shortcuts with numbers
      // Front: 1
      if (!isCtrlOrMeta && !isAlt && e.key === "1") {
        e.preventDefault();
        setActivePrintArea("front");
        return;
      }

      // Back: 2
      if (!isCtrlOrMeta && !isAlt && e.key === "2") {
        e.preventDefault();
        setActivePrintArea("back");
        return;
      }

      // Left Sleeve: 3
      if (!isCtrlOrMeta && !isAlt && e.key === "3") {
        e.preventDefault();
        setActivePrintArea("left-sleeve");
        return;
      }

      // Right Sleeve: 4
      if (!isCtrlOrMeta && !isAlt && e.key === "4") {
        e.preventDefault();
        setActivePrintArea("right-sleeve");
        return;
      }

      // Save: Ctrl+S
      if (isCtrlOrMeta && e.key === "s") {
        e.preventDefault();
        saveImprint();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDesignId) {
          e.preventDefault();
          removeDesign(selectedDesignId);
        }
        return;
      }

      // Deselect: Escape
      if (e.key === "Escape") {
        e.preventDefault();
        selectDesign(null);
        return;
      }

      // Reset Camera: Ctrl+0
      if (isCtrlOrMeta && e.key === "0") {
        e.preventDefault();
        resetCamera();
        return;
      }

      // Toggle Left Panel: Ctrl+B
      if (isCtrlOrMeta && e.key === "b") {
        e.preventDefault();
        setLeftPanelView(leftPanelView ? null : "designs");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedDesignId,
    removeDesign,
    selectDesign,
    saveImprint,
    resetCamera,
    setActiveTool,
    setLeftPanelView,
    setRightPanelOpen,
    setActivePrintArea,
    rightPanelOpen,
    leftPanelView,
  ]);
}
