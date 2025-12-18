"use client";

import type { Canvas, FabricObject } from "fabric";

export type CanvasSize = {
  width: number;
  height: number;
};

export type CanvasPreset = {
  name: string;
  width: number;
  height: number;
  category: "social" | "print" | "presentation" | "custom";
};

export type LayerItem = {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  object: FabricObject;
};

export type HistoryState = {
  json: string;
  timestamp: number;
};

export type AlignmentType = "left" | "center" | "right" | "top" | "middle" | "bottom";

export type DistributionType = "horizontal" | "vertical";

export type ExportFormat = "png" | "jpg" | "svg" | "json";

export type ToolType = "select" | "text" | "rectangle" | "circle" | "triangle" | "line" | "image" | "draw";

export type DesignerContextValue = {
  canvas: Canvas | null;
  setCanvas: (canvas: Canvas | null) => void;
  selectedObjects: FabricObject[];
  setSelectedObjects: (objects: FabricObject[]) => void;
  layers: LayerItem[];
  setLayers: (layers: LayerItem[]) => void;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  canvasSize: CanvasSize;
  setCanvasSize: (size: CanvasSize) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  gridEnabled: boolean;
  setGridEnabled: (enabled: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  history: HistoryState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  addText: (text?: string) => void;
  addRectangle: () => void;
  addCircle: () => void;
  addTriangle: () => void;
  addLine: () => void;
  addImage: (url: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  alignObjects: (alignment: AlignmentType) => void;
  distributeObjects: (distribution: DistributionType) => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  exportCanvas: (format: ExportFormat) => void;
  clearCanvas: () => void;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  // Social Media
  { name: "Instagram Post", width: 1080, height: 1080, category: "social" },
  { name: "Instagram Story", width: 1080, height: 1920, category: "social" },
  { name: "Facebook Post", width: 1200, height: 630, category: "social" },
  { name: "Twitter Post", width: 1200, height: 675, category: "social" },
  { name: "LinkedIn Post", width: 1200, height: 627, category: "social" },
  { name: "YouTube Thumbnail", width: 1280, height: 720, category: "social" },

  // Print
  { name: "A4 Portrait", width: 2480, height: 3508, category: "print" },
  { name: "A4 Landscape", width: 3508, height: 2480, category: "print" },
  { name: "Letter Portrait", width: 2550, height: 3300, category: "print" },
  { name: "Letter Landscape", width: 3300, height: 2550, category: "print" },
  { name: "Business Card", width: 1050, height: 600, category: "print" },

  // Presentation
  { name: "16:9 HD", width: 1920, height: 1080, category: "presentation" },
  { name: "4:3 Standard", width: 1024, height: 768, category: "presentation" },
  { name: "Square", width: 1000, height: 1000, category: "presentation" },
];

export const DEFAULT_CANVAS_SIZE: CanvasSize = {
  width: 800,
  height: 600,
};
