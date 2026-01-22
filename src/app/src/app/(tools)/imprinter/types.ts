import type { Design } from "@/lib/server/design";

export type ProductModel = "tshirt" | "mug" | "hoodie";

export type PrintArea = "front" | "back" | "left-sleeve" | "right-sleeve";

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
  productModel: ProductModel;
  productColor: string;
  appliedDesigns: AppliedDesign[];
  cameraState: CameraState;
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type Tool = "select" | "move" | "rotate" | "scale" | "color-picker";

export type LeftPanelView = "designs" | "assets" | "templates" | null;
