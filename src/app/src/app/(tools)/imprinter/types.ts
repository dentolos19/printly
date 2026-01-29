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
  rayDirection: [number, number, number]; // Direction for raycasting
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

export type AppliedDesign = {
  id: string;
  designId: string;
  designData: Design;
  printArea: PrintArea;
  transform: Transform3D;
  opacity: number;
};

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

export type Tool = "select" | "move" | "rotate" | "scale" | "color-picker";

export type LeftPanelView = "designs" | "assets" | "templates" | null;
