import type { Design } from "@/lib/server/design";
import type { ProductResponse, ProductVariantResponse } from "@/lib/server/product";

// Product model now references a product ID (or legacy hardcoded types)
export type ProductModel = string; // Product ID or legacy: "tshirt" | "mug" | "hoodie"

// Print areas are now dynamic based on the model
export type PrintArea = string; // Dynamic print area ID

// Print area configuration for a model
export type PrintAreaConfig = {
  id: string;
  name: string;
  meshName?: string | null;
  rayDirection: [number, number, number];
  displayOrder?: number;
  isAutoDetected?: boolean;
};

// Auto-detected print area from GLB model
export type DetectedPrintArea = {
  areaId: string;
  name: string;
  meshName: string;
  rayDirection: [number, number, number];
  meshNormal: [number, number, number];
};

// Model configuration
export type ModelConfig = {
  id: string;
  name: string;
  modelUrl: string;
  printAreas: PrintAreaConfig[];
};

// Selected product info
export type SelectedProduct = {
  product: ProductResponse;
  variant: ProductVariantResponse | null;
} | null;

export type Transform3D = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

// Decal source can be an uploaded image, a design from the library, or generated text
export type DecalSource =
  | { type: "design"; designId: string; designData: Design }
  | { type: "image"; assetId: string; name: string }
  | { type: "text"; text: string; fontFamily: string; fontSize: number; color: string };

export type AppliedDesign = {
  id: string;
  name?: string;
  designId: string;
  designData: Design;
  printArea: PrintArea;
  transform: Transform3D;
  opacity: number;
  // Layer system
  zIndex: number;
  visible: boolean;
  locked: boolean;
  // Placement mode used when this decal was created
  placementMode: PlacementMode;
  // Optional source info for non-design decals
  source?: DecalSource;
};

export type PlacementMode = "zone" | "free";

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

export type ImprinterData = {
  version: string;
  productId: string | null;
  variantId: string | null;
  productColor: string;
  appliedDesigns: AppliedDesign[];
  cameraState: CameraState;
  // Legacy support
  productModel?: string;
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type Tool = "select" | "move" | "rotate" | "scale" | "color-picker" | "place" | "text";

export type LeftPanelView = "designs" | "assets" | "templates" | "products" | null;

// Export resolution presets
export type ExportPreset = {
  label: string;
  width: number;
  height: number;
};

export const EXPORT_PRESETS: ExportPreset[] = [
  { label: "Standard (1080p)", width: 1920, height: 1080 },
  { label: "High (2K)", width: 2560, height: 1440 },
  { label: "Ultra (4K)", width: 3840, height: 2160 },
  { label: "Square (1080)", width: 1080, height: 1080 },
  { label: "Square (2160)", width: 2160, height: 2160 },
];

// Undo/redo action
export type HistoryAction = {
  type: "add" | "remove" | "update" | "reorder";
  designId: string;
  before: AppliedDesign | null;
  after: AppliedDesign | null;
};
