"use client";

import type { Design } from "@/lib/server/design";
import type { PrintAreaResponse } from "@/lib/server/print-area";
import type { ProductResponse, ProductVariantResponse } from "@/lib/server/product";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAutoSave } from "../../../shared/hooks/use-auto-save";
import type {
  AppliedDesign,
  CameraState,
  ExportPreset,
  HistoryAction,
  ImprinterData,
  LeftPanelView,
  ModelConfig,
  PlacementMode,
  PrintArea,
  PrintAreaConfig,
  ProductModel,
  SelectedProduct,
  Tool,
  Transform3D,
} from "../../types";

const IMPRINTER_DATA_VERSION = "1.1";

// Default print areas fallback for products without configured areas
const DEFAULT_PRINT_AREAS: PrintAreaConfig[] = [
  { id: "front", name: "Front", rayDirection: [0, 0, 1], displayOrder: 0 },
  { id: "back", name: "Back", rayDirection: [0, 0, -1], displayOrder: 1 },
];

// Extended print areas for apparel (name-based fallback)
const APPAREL_PRINT_AREAS: PrintAreaConfig[] = [
  ...DEFAULT_PRINT_AREAS,
  { id: "left-sleeve", name: "Left Sleeve", rayDirection: [-1, 0, 0], displayOrder: 2 },
  { id: "right-sleeve", name: "Right Sleeve", rayDirection: [1, 0, 0], displayOrder: 3 },
];

// Convert API response to PrintAreaConfig
function toPrintAreaConfig(response: PrintAreaResponse): PrintAreaConfig {
  return {
    id: response.areaId,
    name: response.name,
    meshName: response.meshName,
    rayDirection: response.rayDirection,
    displayOrder: response.displayOrder,
    isAutoDetected: response.isAutoDetected,
  };
}

type ImprinterContextValue = {
  // Product state
  productModel: ProductModel;
  productColor: string;
  appliedDesigns: AppliedDesign[];
  selectedDesignId: string | null;

  // Dynamic product state
  selectedProduct: SelectedProduct;
  availableProducts: ProductResponse[];
  modelConfig: ModelConfig | null;
  availablePrintAreas: PrintAreaConfig[];

  // UI state
  activeTool: Tool;
  activePrintArea: PrintArea;
  leftPanelView: LeftPanelView;
  rightPanelOpen: boolean;
  showProductDialog: boolean;
  pendingDesignId: string | null;
  placementMode: PlacementMode;

  // Camera state
  cameraState: CameraState;

  // Design persistence
  imprintId: string | null;
  imprintName: string;
  setImprintName: (name: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
  isDirty: boolean;

  // Product actions
  changeProductModel: (model: ProductModel) => void;
  changeProductColor: (color: string) => void;
  selectProduct: (product: ProductResponse, variant?: ProductVariantResponse | null) => void;
  setAvailableProducts: (products: ProductResponse[]) => void;

  // Design actions
  addDesignToProduct: (design: Design, printArea: PrintArea) => void;
  addImageToProduct: (file: File, printArea: PrintArea) => Promise<void>;
  addTextToProduct: (text: string, fontFamily: string, fontSize: number, color: string, printArea: PrintArea) => void;
  updateDesignTransform: (id: string, transform: Partial<Transform3D>) => void;
  updateDesignOpacity: (id: string, opacity: number) => void;
  updateDesignPrintArea: (id: string, printArea: PrintArea) => void;
  removeDesign: (id: string) => void;
  selectDesign: (id: string | null) => void;
  duplicateDesign: (id: string) => void;

  // Layer actions
  moveDesignUp: (id: string) => void;
  moveDesignDown: (id: string) => void;
  renameDesign: (id: string, name: string) => void;
  toggleDesignVisibility: (id: string) => void;
  toggleDesignLock: (id: string) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // UI actions
  setActiveTool: (tool: Tool) => void;
  setActivePrintArea: (area: PrintArea) => void;
  setLeftPanelView: (view: LeftPanelView) => void;
  setRightPanelOpen: (open: boolean) => void;
  setPlacementMode: (mode: PlacementMode) => void;

  // Camera actions
  resetCamera: () => void;

  // Persistence
  saveImprint: (options?: { force?: boolean; nameOverride?: string }) => Promise<string | null>;
  loadImprint: (id: string) => Promise<void>;
  exportRender: (resolution: number) => void;
  exportHighRes: (preset: ExportPreset) => Promise<void>;
  registerCaptureFunction: (fn: () => Promise<Blob | null>) => void;
  registerHighResCaptureFunction: (fn: (width: number, height: number) => Promise<Blob | null>) => void;
};

const ImprinterContext = createContext<ImprinterContextValue | null>(null);

type ImprinterProviderProps = {
  children: ReactNode;
  initialImprintId?: string | null;
  initialImprintName?: string;
  initialProductId?: string | null;
  initialVariantId?: string | null;
  initialDesignId?: string | null;
  needsProductSelection?: boolean;
  onProductSelected?: () => void;
  onSave?: (
    data: { name: string; data: string; currentId: string | null; previewId?: string | null } & Partial<ImprinterData>,
  ) => Promise<{ id: string }>;
  onLoad?: (id: string) => Promise<{ name: string; data: string }>;
  onLoadDesign?: (designId: string) => Promise<Design>;
  onLoadProducts?: () => Promise<ProductResponse[]>;
  onLoadPrintAreas?: (productId: string) => Promise<PrintAreaResponse[]>;
  onUploadPreview?: (blob: Blob) => Promise<string>;
};

// Helper to determine print areas based on product name/type
function getPrintAreasForProduct(product: ProductResponse): PrintAreaConfig[] {
  const name = product.name.toLowerCase();
  // Apparel products have sleeves
  if (name.includes("shirt") || name.includes("hoodie") || name.includes("jacket") || name.includes("sweater")) {
    return APPAREL_PRINT_AREAS;
  }
  // Default print areas for other products (mugs, caps, etc.)
  return DEFAULT_PRINT_AREAS;
}

// Helper to convert color name to hex
function colorNameToHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    navy: "#1e3a5a",
    gray: "#6b7280",
    grey: "#6b7280",
    pink: "#ec4899",
    purple: "#8b5cf6",
    orange: "#f97316",
    yellow: "#eab308",
    brown: "#78350f",
  };
  return colorMap[colorName.toLowerCase()] || "#ffffff";
}

export function ImprinterProvider({
  children,
  initialImprintId = null,
  initialImprintName = "Untitled Imprint",
  initialProductId = null,
  initialVariantId = null,
  initialDesignId = null,
  needsProductSelection = false,
  onProductSelected,
  onSave,
  onLoad,
  onLoadDesign,
  onLoadProducts,
  onLoadPrintAreas,
  onUploadPreview,
}: ImprinterProviderProps) {
  // Product state (legacy support for hardcoded models)
  const [productModel, setProductModel] = useState<ProductModel>("");
  const [productColor, setProductColor] = useState("#ffffff");
  const [appliedDesigns, setAppliedDesigns] = useState<AppliedDesign[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // Placement mode
  const [placementMode, setPlacementMode] = useState<PlacementMode>("zone");

  // Undo/redo history
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  // High-res capture function ref
  const highResCaptureFunctionRef = useRef<((width: number, height: number) => Promise<Blob | null>) | null>(null);

  const registerHighResCaptureFunction = useCallback((fn: (width: number, height: number) => Promise<Blob | null>) => {
    highResCaptureFunctionRef.current = fn;
  }, []);

  // Helper to push to undo stack
  const pushUndo = useCallback((action: HistoryAction) => {
    setUndoStack((prev) => [...prev.slice(-49), action]);
    setRedoStack([]);
  }, []);

  // Dynamic product state
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductResponse[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Print areas state (loaded from API or fallback)
  const [loadedPrintAreas, setLoadedPrintAreas] = useState<PrintAreaConfig[] | null>(null);
  const [printAreasLoading, setPrintAreasLoading] = useState(false);

  // UI state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activePrintArea, setActivePrintArea] = useState<PrintArea>("front");
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>(needsProductSelection ? "products" : "designs");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(needsProductSelection);
  const [pendingDesignId, setPendingDesignId] = useState<string | null>(initialDesignId);

  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [0, 0, 5],
    target: [0, 0, 0],
  });

  // Screenshot capture function ref
  const captureFunctionRef = useRef<(() => Promise<Blob | null>) | null>(null);

  const registerCaptureFunction = useCallback((fn: () => Promise<Blob | null>) => {
    captureFunctionRef.current = fn;
  }, []);

  // Design persistence state
  const [imprintName, setImprintNameState] = useState(initialImprintName);
  const [imprintId, setImprintId] = useState<string | null>(initialImprintId);

  // Compute available print areas with fallback logic:
  // 1. Use API-loaded print areas if available
  // 2. Fall back to name-based detection (apparel vs default)
  // 3. Fall back to default front/back areas
  const availablePrintAreas = useMemo<PrintAreaConfig[]>(() => {
    if (loadedPrintAreas && loadedPrintAreas.length > 0) {
      return loadedPrintAreas;
    }
    // Fallback: use name-based detection
    if (selectedProduct?.product) {
      return getPrintAreasForProduct(selectedProduct.product);
    }
    return DEFAULT_PRINT_AREAS;
  }, [loadedPrintAreas, selectedProduct]);

  // Compute model config from selected product
  const modelConfig = useMemo<ModelConfig | null>(() => {
    if (!selectedProduct?.product.modelId) return null;
    return {
      id: selectedProduct.product.id,
      name: selectedProduct.product.name,
      modelUrl: `/assets/${selectedProduct.product.modelId}/view`,
      printAreas: availablePrintAreas,
    };
  }, [selectedProduct, availablePrintAreas]);

  // Load print areas when product changes
  useEffect(() => {
    if (!selectedProduct?.product.id) {
      setLoadedPrintAreas(null);
      return;
    }

    if (!onLoadPrintAreas) {
      // No API handler, use fallback
      setLoadedPrintAreas(null);
      return;
    }

    const productId = selectedProduct.product.id;
    setPrintAreasLoading(true);

    onLoadPrintAreas(productId)
      .then((areas) => {
        if (areas.length > 0) {
          setLoadedPrintAreas(areas.map(toPrintAreaConfig));
        } else {
          // No configured areas, use fallback
          setLoadedPrintAreas(null);
        }
      })
      .catch((error) => {
        console.error("Failed to load print areas:", error);
        setLoadedPrintAreas(null);
      })
      .finally(() => {
        setPrintAreasLoading(false);
      });
  }, [selectedProduct?.product.id, onLoadPrintAreas]);

  // Serialize function for auto-save
  const serializeImprint = useCallback(() => {
    // Optimize: Strip heavy designData
    const optimizedAppliedDesigns = appliedDesigns.map((design) => ({
      ...design,
      designData: {
        id: design.designData.id,
        name: design.designData.name,
        coverId: design.designData.coverId,
      },
      // Preserve source for reliable rehydration of non-design decals
      source: design.source,
    }));

    const imprintData: ImprinterData = {
      version: IMPRINTER_DATA_VERSION,
      productId: selectedProduct?.product.id || null,
      variantId: selectedProduct?.variant?.id || null,
      productColor,
      appliedDesigns: optimizedAppliedDesigns as AppliedDesign[],
      cameraState,
      // Legacy support
      productModel: productModel || undefined,
    };

    return imprintData;
  }, [appliedDesigns, cameraState, productColor, selectedProduct, productModel]);

  // Wrap onSave to capture and upload preview before saving
  const onSaveWithPreview = useCallback(
    async (data: { name: string; data: string; currentId: string | null } & Partial<ImprinterData>) => {
      if (!onSave) {
        throw new Error("No save handler provided");
      }

      let previewId: string | null = null;

      // Capture and upload preview if we have a capture function and upload handler
      if (captureFunctionRef.current && onUploadPreview) {
        try {
          const blob = await captureFunctionRef.current();
          if (blob) {
            previewId = await onUploadPreview(blob);
          }
        } catch (error) {
          console.error("Failed to capture/upload preview:", error);
        }
      }

      return onSave({ ...data, previewId });
    },
    [onSave, onUploadPreview],
  );

  // Use shared auto-save hook
  const { saveStatus, lastSavedAt, isDirty, triggerAutoSave, saveNow } = useAutoSave({
    id: imprintId,
    name: imprintName,
    serialize: serializeImprint,
    onSave: onSave ? onSaveWithPreview : undefined,
    onIdChange: (id) => {
      setImprintId(id);
      hasLoadedInitialImprint.current = true;
    },
  });

  // Sync internal ID with prop if it changes externally (e.g. navigation)
  useEffect(() => {
    if (initialImprintId && initialImprintId !== imprintId) {
      setImprintId(initialImprintId);
    }
  }, [initialImprintId, imprintId]);

  // ============================================================================
  // Product actions
  // ============================================================================

  const changeProductModel = useCallback(
    (model: ProductModel) => {
      setProductModel(model);
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const changeProductColor = useCallback(
    (color: string) => {
      setProductColor(color);
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const selectProduct = useCallback(
    async (product: ProductResponse, variant?: ProductVariantResponse | null) => {
      setSelectedProduct({ product, variant: variant || null });
      setProductModel(product.id);

      // Auto-select color from variant if available
      if (variant?.color) {
        const hexColor = colorNameToHex(variant.color);
        setProductColor(hexColor);
      }

      // Reset print area to front when switching products
      setActivePrintArea("front");

      // If there's a pending design to load, load it now
      if (pendingDesignId && onLoadDesign) {
        try {
          const design = await onLoadDesign(pendingDesignId);
          const newDesign: AppliedDesign = {
            id: crypto.randomUUID(),
            designId: design.id,
            designData: design,
            printArea: "front",
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            opacity: 1,
            zIndex: 0,
            visible: true,
            locked: false,
            placementMode: "zone",
          };
          setAppliedDesigns([newDesign]);
          setSelectedDesignId(newDesign.id);
          setPendingDesignId(null);
        } catch (error) {
          console.error("Failed to load initial design:", error);
        }
      }

      // Close product dialog and notify parent
      setShowProductDialog(false);
      onProductSelected?.();

      triggerAutoSave();
    },
    [triggerAutoSave, pendingDesignId, onLoadDesign, onProductSelected],
  );

  const handleSetAvailableProducts = useCallback((products: ProductResponse[]) => {
    setAvailableProducts(products);
  }, []);

  const handleSetImprintName = useCallback(
    (name: string) => {
      setImprintNameState(name);
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  // ============================================================================
  // Design actions
  // ============================================================================

  const addDesignToProduct = useCallback(
    (design: Design, printArea: PrintArea) => {
      const newDesign: AppliedDesign = {
        id: crypto.randomUUID(),
        name: design.name,
        designId: design.id,
        designData: design,
        printArea,
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        opacity: 1,
        zIndex: appliedDesigns.length,
        visible: true,
        locked: false,
        placementMode,
        source: { type: "design", designId: design.id, designData: design },
      };

      pushUndo({ type: "add", designId: newDesign.id, before: null, after: newDesign });
      setAppliedDesigns((prev) => [...prev, newDesign]);
      setSelectedDesignId(newDesign.id);
      triggerAutoSave();
    },
    [triggerAutoSave, appliedDesigns.length, placementMode, pushUndo],
  );

  const addImageToProduct = useCallback(
    async (file: File, printArea: PrintArea) => {
      if (!onUploadPreview) return;
      try {
        const asset = await onUploadPreview(new Blob([file], { type: file.type }));
        const mockDesign: Design = {
          id: asset,
          name: file.name.replace(/\.[^.]+$/, ""),
          data: JSON.stringify({ version: "1.0", objects: [] }),
          coverId: asset,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const newDesign: AppliedDesign = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ""),
          designId: asset,
          designData: mockDesign,
          printArea,
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          opacity: 1,
          zIndex: appliedDesigns.length,
          visible: true,
          locked: false,
          placementMode,
          source: { type: "image", assetId: asset, name: file.name },
        };
        pushUndo({ type: "add", designId: newDesign.id, before: null, after: newDesign });
        setAppliedDesigns((prev) => [...prev, newDesign]);
        setSelectedDesignId(newDesign.id);
        triggerAutoSave();
      } catch (error) {
        const err = error as Error & { isCopyrightViolation?: boolean };
        if (err.isCopyrightViolation) {
          toast.error(err.message);
        } else {
          toast.error("Failed to upload image.");
        }
      }
    },
    [triggerAutoSave, onUploadPreview, appliedDesigns.length, placementMode, pushUndo],
  );

  const addTextToProduct = useCallback(
    (text: string, fontFamily: string, fontSize: number, color: string, printArea: PrintArea) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "transparent";
      ctx.clearRect(0, 0, 512, 256);
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 128);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const mockDesign: Design = {
          id: `text-${crypto.randomUUID()}`,
          name: text.slice(0, 30),
          data: JSON.stringify({ version: "1.0", objects: [] }),
          coverId: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const newDesign: AppliedDesign = {
          id: crypto.randomUUID(),
          name: text.slice(0, 30),
          designId: mockDesign.id,
          designData: { ...mockDesign, coverId: url },
          printArea,
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          opacity: 1,
          zIndex: appliedDesigns.length,
          visible: true,
          locked: false,
          placementMode,
          source: { type: "text", text, fontFamily, fontSize, color },
        };
        pushUndo({ type: "add", designId: newDesign.id, before: null, after: newDesign });
        setAppliedDesigns((prev) => [...prev, newDesign]);
        setSelectedDesignId(newDesign.id);
        triggerAutoSave();
      }, "image/png");
    },
    [triggerAutoSave, appliedDesigns.length, placementMode, pushUndo],
  );

  const updateDesignTransform = useCallback(
    (id: string, transform: Partial<Transform3D>) => {
      setAppliedDesigns((prev) =>
        prev.map((design) =>
          design.id === id
            ? {
                ...design,
                transform: {
                  position: transform.position ?? design.transform.position,
                  rotation: transform.rotation ?? design.transform.rotation,
                  scale: transform.scale ?? design.transform.scale,
                },
              }
            : design,
        ),
      );
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const updateDesignOpacity = useCallback(
    (id: string, opacity: number) => {
      setAppliedDesigns((prev) => prev.map((design) => (design.id === id ? { ...design, opacity } : design)));
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const updateDesignPrintArea = useCallback(
    (id: string, printArea: PrintArea) => {
      setAppliedDesigns((prev) =>
        prev.map((design) =>
          design.id === id ? { ...design, printArea, transform: { ...design.transform, position: [0, 0, 0] } } : design,
        ),
      );
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const removeDesign = useCallback(
    (id: string) => {
      const removed = appliedDesigns.find((d) => d.id === id);
      if (removed) {
        pushUndo({ type: "remove", designId: id, before: removed, after: null });
      }
      setAppliedDesigns((prev) => prev.filter((design) => design.id !== id));
      if (selectedDesignId === id) {
        setSelectedDesignId(null);
      }
      triggerAutoSave();
    },
    [selectedDesignId, triggerAutoSave, appliedDesigns, pushUndo],
  );

  const selectDesign = useCallback((id: string | null) => {
    setSelectedDesignId(id);
  }, []);

  const duplicateDesign = useCallback(
    (id: string) => {
      const original = appliedDesigns.find((d) => d.id === id);
      if (!original) return;
      const copy: AppliedDesign = {
        ...original,
        id: crypto.randomUUID(),
        zIndex: appliedDesigns.length,
        transform: {
          ...original.transform,
          position: [
            original.transform.position[0] + 0.05,
            original.transform.position[1] - 0.05,
            original.transform.position[2],
          ],
        },
      };
      pushUndo({ type: "add", designId: copy.id, before: null, after: copy });
      setAppliedDesigns((prev) => [...prev, copy]);
      setSelectedDesignId(copy.id);
      triggerAutoSave();
    },
    [appliedDesigns, triggerAutoSave, pushUndo],
  );

  // ============================================================================
  // Layer actions
  // ============================================================================

  const moveDesignUp = useCallback(
    (id: string) => {
      setAppliedDesigns((prev) => {
        const idx = prev.findIndex((d) => d.id === id);
        if (idx < 0 || idx >= prev.length - 1) return prev;
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next.map((d, i) => ({ ...d, zIndex: i }));
      });
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const moveDesignDown = useCallback(
    (id: string) => {
      setAppliedDesigns((prev) => {
        const idx = prev.findIndex((d) => d.id === id);
        if (idx <= 0) return prev;
        const next = [...prev];
        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
        return next.map((d, i) => ({ ...d, zIndex: i }));
      });
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const renameDesign = useCallback(
    (id: string, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      setAppliedDesigns((prev) => prev.map((design) => (design.id === id ? { ...design, name: trimmedName } : design)));
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const toggleDesignVisibility = useCallback(
    (id: string) => {
      setAppliedDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d)));
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  const toggleDesignLock = useCallback(
    (id: string) => {
      setAppliedDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, locked: !d.locked } : d)));
      triggerAutoSave();
    },
    [triggerAutoSave],
  );

  // ============================================================================
  // Undo / Redo
  // ============================================================================

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      setRedoStack((r) => [...r, action]);

      if (action.type === "add" && action.after) {
        setAppliedDesigns((d) => d.filter((x) => x.id !== action.designId));
      } else if (action.type === "remove" && action.before) {
        setAppliedDesigns((d) => [...d, action.before!]);
      } else if (action.type === "update" && action.before) {
        setAppliedDesigns((d) => d.map((x) => (x.id === action.designId ? action.before! : x)));
      }

      triggerAutoSave();
      return prev.slice(0, -1);
    });
  }, [triggerAutoSave]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      setUndoStack((u) => [...u, action]);

      if (action.type === "add" && action.after) {
        setAppliedDesigns((d) => [...d, action.after!]);
      } else if (action.type === "remove") {
        setAppliedDesigns((d) => d.filter((x) => x.id !== action.designId));
      } else if (action.type === "update" && action.after) {
        setAppliedDesigns((d) => d.map((x) => (x.id === action.designId ? action.after! : x)));
      }

      triggerAutoSave();
      return prev.slice(0, -1);
    });
  }, [triggerAutoSave]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // ============================================================================
  // Camera actions
  // ============================================================================

  const resetCamera = useCallback(() => {
    setCameraState({
      position: [0, 0, 5],
      target: [0, 0, 0],
    });
  }, []);

  // ============================================================================
  // Persistence
  // ============================================================================

  const saveImprint = saveNow;

  const loadImprint = useCallback(
    async (id: string, products?: ProductResponse[]) => {
      if (!onLoad) return;

      try {
        const result = await onLoad(id);
        const data: ImprinterData = JSON.parse(result.data);

        setImprintId(id);
        setImprintNameState(result.name);
        setProductColor(data.productColor);
        setCameraState(data.cameraState);

        // Use provided products or fall back to state
        const productsToSearch = products || availableProducts;

        // Handle legacy productModel or new productId format
        if (data.productId && productsToSearch.length > 0) {
          const product = productsToSearch.find((p) => p.id === data.productId);
          if (product) {
            const variant = data.variantId ? product.variants.find((v) => v.id === data.variantId) || null : null;
            setSelectedProduct({ product, variant });
            setProductModel(product.id);
          }
        } else if (data.productModel) {
          // Legacy support for hardcoded models
          setProductModel(data.productModel);
        }

        // Restore full design data for each applied design using source-type-aware loading
        if (data.appliedDesigns.length > 0) {
          const designsWithFullData = await Promise.all(
            data.appliedDesigns.map(async (appliedDesign) => {
              const source = appliedDesign.source;

              // Source-aware rehydration: only call onLoadDesign for actual designs
              if (source?.type === "image") {
                // Uploaded image decals: reconstruct from asset ID
                const mockDesign: Design = {
                  id: source.assetId,
                  name: source.name,
                  data: JSON.stringify({ version: "1.0", objects: [] }),
                  coverId: source.assetId,
                  createdAt: appliedDesign.designData?.createdAt || new Date().toISOString(),
                  updatedAt: appliedDesign.designData?.updatedAt || new Date().toISOString(),
                };
                return { ...appliedDesign, designId: source.assetId, designData: mockDesign };
              }

              if (source?.type === "text") {
                // Text decals: regenerate bitmap from source parameters
                const bitmap = await new Promise<string>((resolve) => {
                  const canvas = document.createElement("canvas");
                  canvas.width = 512;
                  canvas.height = 256;
                  const ctx = canvas.getContext("2d")!;
                  ctx.clearRect(0, 0, 512, 256);
                  ctx.fillStyle = source.color;
                  ctx.font = `${source.fontSize}px ${source.fontFamily}`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText(source.text, 256, 128);
                  resolve(canvas.toDataURL("image/png"));
                });
                const mockDesign: Design = {
                  id: appliedDesign.designId,
                  name: source.text.slice(0, 30),
                  data: JSON.stringify({ version: "1.0", objects: [] }),
                  coverId: bitmap,
                  createdAt: appliedDesign.designData?.createdAt || new Date().toISOString(),
                  updatedAt: appliedDesign.designData?.updatedAt || new Date().toISOString(),
                };
                return { ...appliedDesign, designData: mockDesign };
              }

              // Design type (or legacy without source): load from API
              if (onLoadDesign) {
                const designId = appliedDesign.designData?.id || appliedDesign.designId;
                if (!designId) {
                  console.warn("Applied design missing designId, skipping");
                  return null;
                }
                try {
                  const fullDesign = await onLoadDesign(designId);
                  return {
                    ...appliedDesign,
                    designData: fullDesign,
                    source: source || { type: "design" as const, designId, designData: fullDesign },
                  };
                } catch (error) {
                  console.error(`Failed to load design ${designId}:`, error);
                  // Return with existing partial data instead of dropping entirely
                  if (appliedDesign.designData?.coverId) {
                    return appliedDesign;
                  }
                  return null;
                }
              }

              // No loader available: keep existing data if it has a coverId
              if (appliedDesign.designData?.coverId) {
                return appliedDesign;
              }
              return null;
            }),
          );

          const validDesigns = designsWithFullData.filter(
            (d): d is NonNullable<typeof d> => d !== null && d.designData !== null,
          );
          setAppliedDesigns(validDesigns);
        } else {
          setAppliedDesigns([]);
        }
      } catch (error) {
        console.error("Failed to load imprint:", error);
        throw error;
      }
    },
    [onLoad, onLoadDesign, availableProducts],
  );

  const exportRender = useCallback(
    async (resolution: number) => {
      const capture = highResCaptureFunctionRef.current || captureFunctionRef.current;
      if (!capture) {
        console.warn("No capture function registered");
        return;
      }
      try {
        const blob = highResCaptureFunctionRef.current
          ? await highResCaptureFunctionRef.current(resolution, resolution)
          : await captureFunctionRef.current!();
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${imprintName || "render"}-${resolution}px.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("Export render failed:", error);
      }
    },
    [imprintName],
  );

  const exportHighRes = useCallback(
    async (preset: ExportPreset) => {
      const capture = highResCaptureFunctionRef.current || captureFunctionRef.current;
      if (!capture) {
        console.warn("No capture function registered");
        return;
      }
      try {
        const blob = highResCaptureFunctionRef.current
          ? await highResCaptureFunctionRef.current(preset.width, preset.height)
          : await captureFunctionRef.current!();
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${imprintName || "render"}-${preset.width}x${preset.height}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("High-res export failed:", error);
      }
    },
    [imprintName],
  );

  // ============================================================================
  // Initial product loading
  // ============================================================================

  const hasLoadedInitialProduct = useRef(false);
  const hasLoadedInitialImprint = useRef(false);

  useEffect(() => {
    // Load products and set initial product/variant if provided
    if (onLoadProducts && !hasLoadedInitialProduct.current) {
      hasLoadedInitialProduct.current = true;

      onLoadProducts()
        .then(async (products) => {
          // Filter to only products with models (using modelId, not modelUrl)
          const productsWithModels = products.filter((p) => p.modelId);
          setAvailableProducts(productsWithModels);
          setProductsLoaded(true);

          // If we have an imprint to load, load it now with products context
          if (initialImprintId && onLoad && !hasLoadedInitialImprint.current) {
            hasLoadedInitialImprint.current = true;
            try {
              await loadImprint(initialImprintId, productsWithModels);
            } catch (error) {
              console.error("Failed to load initial imprint:", error);
            }
          } else if (initialProductId) {
            // If no imprint but initial product ID is provided, select it
            const product = productsWithModels.find((p) => p.id === initialProductId);
            if (product) {
              const variant = initialVariantId ? product.variants.find((v) => v.id === initialVariantId) || null : null;
              setSelectedProduct({ product, variant });
              setProductModel(product.id);

              // Auto-select color from variant
              if (variant?.color) {
                setProductColor(colorNameToHex(variant.color));
              }
            }
          }
        })
        .catch((error) => {
          console.error("Failed to load products:", error);
          setProductsLoaded(true); // Set to true even on error to unblock UI
        });
    }
  }, [onLoadProducts, initialProductId, initialVariantId, initialImprintId, onLoad, loadImprint]);

  // ============================================================================
  // Context value
  // ============================================================================

  const value = useMemo<ImprinterContextValue>(
    () => ({
      // Product state
      productModel,
      productColor,
      appliedDesigns,
      selectedDesignId,

      // Dynamic product state
      selectedProduct,
      availableProducts,
      modelConfig,
      availablePrintAreas,

      // UI state
      activeTool,
      activePrintArea,
      leftPanelView,
      rightPanelOpen,
      showProductDialog,
      pendingDesignId,
      placementMode,

      // Camera state
      cameraState,

      // Design persistence
      imprintId,
      imprintName,
      setImprintName: handleSetImprintName,
      saveStatus,
      lastSavedAt,
      isDirty,

      // Product actions
      changeProductModel,
      changeProductColor,
      selectProduct,
      setAvailableProducts: handleSetAvailableProducts,

      // Design actions
      addDesignToProduct,
      addImageToProduct,
      addTextToProduct,
      updateDesignTransform,
      updateDesignOpacity,
      updateDesignPrintArea,
      removeDesign,
      selectDesign,
      duplicateDesign,

      // Layer actions
      moveDesignUp,
      moveDesignDown,
      renameDesign,
      toggleDesignVisibility,
      toggleDesignLock,

      // Undo/redo
      undo,
      redo,
      canUndo,
      canRedo,

      // UI actions
      setActiveTool,
      setActivePrintArea,
      setLeftPanelView,
      setRightPanelOpen,
      setPlacementMode,

      // Camera actions
      resetCamera,

      // Persistence
      saveImprint,
      loadImprint,
      exportRender,
      exportHighRes,
      registerCaptureFunction,
      registerHighResCaptureFunction,
    }),
    [
      productModel,
      productColor,
      appliedDesigns,
      selectedDesignId,
      selectedProduct,
      availableProducts,
      modelConfig,
      availablePrintAreas,
      activeTool,
      activePrintArea,
      leftPanelView,
      rightPanelOpen,
      showProductDialog,
      pendingDesignId,
      placementMode,
      cameraState,
      imprintId,
      imprintName,
      saveStatus,
      lastSavedAt,
      isDirty,
      changeProductModel,
      changeProductColor,
      selectProduct,
      handleSetAvailableProducts,
      addDesignToProduct,
      addImageToProduct,
      addTextToProduct,
      updateDesignTransform,
      updateDesignOpacity,
      updateDesignPrintArea,
      removeDesign,
      selectDesign,
      duplicateDesign,
      moveDesignUp,
      moveDesignDown,
      renameDesign,
      toggleDesignVisibility,
      toggleDesignLock,
      undo,
      redo,
      canUndo,
      canRedo,
      resetCamera,
      saveImprint,
      loadImprint,
      exportRender,
      exportHighRes,
      handleSetImprintName,
      registerCaptureFunction,
      registerHighResCaptureFunction,
      setPlacementMode,
    ],
  );

  return <ImprinterContext.Provider value={value}>{children}</ImprinterContext.Provider>;
}

export function useImprinter() {
  const context = useContext(ImprinterContext);
  if (!context) {
    throw new Error("useImprinter must be used within ImprinterProvider");
  }
  return context;
}
