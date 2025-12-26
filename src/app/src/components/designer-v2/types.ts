"use client";

import type { Canvas, FabricObject } from "fabric";

// ============================================================================
// Canvas Types
// ============================================================================

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

// ============================================================================
// Layer Types
// ============================================================================

export type LayerItem = {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  object: FabricObject;
};

// ============================================================================
// History Types
// ============================================================================

export type HistoryState = {
  json: string;
  timestamp: number;
};

// ============================================================================
// Tool Types
// ============================================================================

export type ToolType =
  | "select"
  | "text"
  | "rectangle"
  | "circle"
  | "triangle"
  | "line"
  | "image"
  | "draw"
  | "shapes"
  | "stickers"
  | "ai-generator";

export type AlignmentType = "left" | "center" | "right" | "top" | "middle" | "bottom";

export type DistributionType = "horizontal" | "vertical";

export type ExportFormat = "png" | "jpg" | "svg" | "json";

// ============================================================================
// Blend Mode Types
// ============================================================================

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
  { value: "hard-light", label: "Hard Light" },
  { value: "soft-light", label: "Soft Light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
];

// ============================================================================
// Design Persistence Types
// ============================================================================

export type DesignData = {
  version: string;
  canvasSize: CanvasSize;
  backgroundColor: string;
  objects: object[];
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// ============================================================================
// AI Generator Types
// ============================================================================

export type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
};

// ============================================================================
// Designer Context Value
// ============================================================================

export type DesignerContextValue = {
  // Canvas state
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

  // History
  history: HistoryState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Design persistence
  designId: string | null;
  designName: string;
  setDesignName: (name: string) => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  isDirty: boolean;
  saveDesign: () => Promise<void>;
  loadDesign: (id: string) => Promise<void>;

  // Object actions
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

  // Alignment & distribution
  alignObjects: (alignment: AlignmentType) => void;
  distributeObjects: (distribution: DistributionType) => void;

  // Layer ordering
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;

  // Export
  exportCanvas: (format: ExportFormat) => void;
  clearCanvas: () => void;

  // AI Generator
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  generateImage: (prompt: string) => Promise<void>;
};

// ============================================================================
// Canvas Presets
// ============================================================================

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
  { name: "T-Shirt Design", width: 2800, height: 3200, category: "print" },

  // Presentation
  { name: "16:9 HD", width: 1920, height: 1080, category: "presentation" },
  { name: "4:3 Standard", width: 1024, height: 768, category: "presentation" },
  { name: "Square", width: 1000, height: 1000, category: "presentation" },
];

export const DEFAULT_CANVAS_SIZE: CanvasSize = {
  width: 2800,
  height: 3200,
};

export const DESIGN_DATA_VERSION = "1.0.0";
