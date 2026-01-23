"use client";

import type { Design } from "@/lib/server/design";
import type { ProductResponse, ProductVariantResponse } from "@/lib/server/product";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAutoSave } from "../../../shared/hooks/use-auto-save";
import type {
  AppliedDesign,
  CameraState,
  ImprinterData,
  LeftPanelView,
  ModelConfig,
  PrintArea,
  PrintAreaConfig,
  ProductModel,
  SelectedProduct,
  Tool,
  Transform3D,
} from "../../types";

const IMPRINTER_DATA_VERSION = "1.1";

// Default print areas for products
const DEFAULT_PRINT_AREAS: PrintAreaConfig[] = [
  { id: "front", name: "Front", rayDirection: [0, 0, 1] },
  { id: "back", name: "Back", rayDirection: [0, 0, -1] },
];

// Extended print areas for apparel
const APPAREL_PRINT_AREAS: PrintAreaConfig[] = [
  ...DEFAULT_PRINT_AREAS,
  { id: "left-sleeve", name: "Left Sleeve", rayDirection: [-1, 0, 0] },
  { id: "right-sleeve", name: "Right Sleeve", rayDirection: [1, 0, 0] },
];

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
  updateDesignTransform: (id: string, transform: Partial<Transform3D>) => void;
  updateDesignOpacity: (id: string, opacity: number) => void;
  removeDesign: (id: string) => void;
  selectDesign: (id: string | null) => void;

  // UI actions
  setActiveTool: (tool: Tool) => void;
  setActivePrintArea: (area: PrintArea) => void;
  setLeftPanelView: (view: LeftPanelView) => void;
  setRightPanelOpen: (open: boolean) => void;

  // Camera actions
  resetCamera: () => void;

  // Persistence
  saveImprint: () => Promise<void>;
  loadImprint: (id: string) => Promise<void>;
  exportRender: (resolution: number) => void;
};

const ImprinterContext = createContext<ImprinterContextValue | null>(null);

type ImprinterProviderProps = {
  children: ReactNode;
  initialImprintId?: string | null;
  initialImprintName?: string;
  initialProductId?: string | null;
  initialVariantId?: string | null;
  onSave?: (
    data: { name: string; data: string; currentId: string | null } & Partial<ImprinterData>,
  ) => Promise<{ id: string }>;
  onLoad?: (id: string) => Promise<{ name: string; data: string }>;
  onLoadDesign?: (designId: string) => Promise<Design>;
  onLoadProducts?: () => Promise<ProductResponse[]>;
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
  onSave,
  onLoad,
  onLoadDesign,
  onLoadProducts,
}: ImprinterProviderProps) {
  // Product state (legacy support for hardcoded models)
  const [productModel, setProductModel] = useState<ProductModel>("");
  const [productColor, setProductColor] = useState("#ffffff");
  const [appliedDesigns, setAppliedDesigns] = useState<AppliedDesign[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // Dynamic product state
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductResponse[]>([]);

  // UI state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activePrintArea, setActivePrintArea] = useState<PrintArea>("front");
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>("designs");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [0, 0, 5],
    target: [0, 0, 0],
  });

  // Design persistence state
  const [imprintName, setImprintNameState] = useState(initialImprintName);
  const [imprintId, setImprintId] = useState<string | null>(initialImprintId);

  // Compute model config from selected product
  const modelConfig = useMemo<ModelConfig | null>(() => {
    if (!selectedProduct?.product.modelUrl) return null;
    return {
      id: selectedProduct.product.id,
      name: selectedProduct.product.name,
      modelUrl: selectedProduct.product.modelUrl,
      printAreas: getPrintAreasForProduct(selectedProduct.product),
    };
  }, [selectedProduct]);

  // Compute available print areas from model config
  const availablePrintAreas = useMemo<PrintAreaConfig[]>(() => {
    return modelConfig?.printAreas || DEFAULT_PRINT_AREAS;
  }, [modelConfig]);

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

  // Use shared auto-save hook
  const { saveStatus, lastSavedAt, isDirty, triggerAutoSave, saveNow } = useAutoSave({
    id: imprintId,
    name: imprintName,
    serialize: serializeImprint,
    onSave,
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
    (product: ProductResponse, variant?: ProductVariantResponse | null) => {
      setSelectedProduct({ product, variant: variant || null });
      setProductModel(product.id);
      
      // Auto-select color from variant if available
      if (variant?.color) {
        const hexColor = colorNameToHex(variant.color);
        setProductColor(hexColor);
      }
      
      // Reset print area to front when switching products
      setActivePrintArea("front");
      
      triggerAutoSave();
    },
    [triggerAutoSave],
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
        designId: design.id,
        designData: design,
        printArea,
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        opacity: 1,
      };

      setAppliedDesigns((prev) => [...prev, newDesign]);
      setSelectedDesignId(newDesign.id);
      triggerAutoSave();
    },
    [triggerAutoSave],
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

  const removeDesign = useCallback(
    (id: string) => {
      setAppliedDesigns((prev) => prev.filter((design) => design.id !== id));
      if (selectedDesignId === id) {
        setSelectedDesignId(null);
      }
      triggerAutoSave();
    },
    [selectedDesignId, triggerAutoSave],
  );

  const selectDesign = useCallback((id: string | null) => {
    setSelectedDesignId(id);
  }, []);

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
    async (id: string) => {
      if (!onLoad) return;

      try {
        const result = await onLoad(id);
        const data: ImprinterData = JSON.parse(result.data);

        setImprintId(id);
        setImprintNameState(result.name);
        setProductColor(data.productColor);
        setCameraState(data.cameraState);
        
        // Handle legacy productModel or new productId format
        if (data.productId && availableProducts.length > 0) {
          const product = availableProducts.find(p => p.id === data.productId);
          if (product) {
            const variant = data.variantId 
              ? product.variants.find(v => v.id === data.variantId) || null
              : null;
            setSelectedProduct({ product, variant });
            setProductModel(product.id);
          }
        } else if (data.productModel) {
          // Legacy support for hardcoded models
          setProductModel(data.productModel);
        }

        // Restore full design data for each applied design
        if (onLoadDesign && data.appliedDesigns.length > 0) {
          const designsWithFullData = await Promise.all(
            data.appliedDesigns.map(async (appliedDesign) => {
              try {
                // Fetch full design data
                const fullDesign = await onLoadDesign(appliedDesign.designData.id);
                return {
                  ...appliedDesign,
                  designData: fullDesign,
                };
              } catch (error) {
                console.error(`Failed to load design ${appliedDesign.designData.id}:`, error);
                // Return with partial data if load fails
                return appliedDesign;
              }
            }),
          );
          setAppliedDesigns(designsWithFullData);
        } else {
          // Fallback if no onLoadDesign provided
          setAppliedDesigns(data.appliedDesigns);
        }
      } catch (error) {
        console.error("Failed to load imprint:", error);
        throw error;
      }
    },
    [onLoad, onLoadDesign, availableProducts],
  );

  const exportRender = useCallback((resolution: number) => {
    // TODO: Implement 3D render export using Three.js render to canvas
    console.log("Export render at resolution:", resolution);
  }, []);

  // ============================================================================
  // Initial product loading
  // ============================================================================

  const hasLoadedInitialProduct = useRef(false);

  useEffect(() => {
    // Load products and set initial product/variant if provided
    if (onLoadProducts && !hasLoadedInitialProduct.current) {
      hasLoadedInitialProduct.current = true;
      
      onLoadProducts().then((products) => {
        // Filter to only products with models
        const productsWithModels = products.filter(p => p.modelUrl);
        setAvailableProducts(productsWithModels);
        
        // If initial product ID is provided, select it
        if (initialProductId) {
          const product = productsWithModels.find(p => p.id === initialProductId);
          if (product) {
            const variant = initialVariantId 
              ? product.variants.find(v => v.id === initialVariantId) || null
              : null;
            setSelectedProduct({ product, variant });
            setProductModel(product.id);
            
            // Auto-select color from variant
            if (variant?.color) {
              setProductColor(colorNameToHex(variant.color));
            }
          }
        }
      }).catch((error) => {
        console.error("Failed to load products:", error);
      });
    }
  }, [onLoadProducts, initialProductId, initialVariantId]);

  // ============================================================================
  // Initial imprint loading
  // ============================================================================

  const hasLoadedInitialImprint = useRef(false);

  useEffect(() => {
    // Load the imprint data when we have an initial imprint ID
    if (initialImprintId && onLoad && !hasLoadedInitialImprint.current) {
      hasLoadedInitialImprint.current = true;

      loadImprint(initialImprintId).catch((error) => {
        console.error("Failed to load initial imprint:", error);
      });
    }
  }, [initialImprintId, onLoad, loadImprint]);

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
      updateDesignTransform,
      updateDesignOpacity,
      removeDesign,
      selectDesign,

      // UI actions
      setActiveTool,
      setActivePrintArea,
      setLeftPanelView,
      setRightPanelOpen,

      // Camera actions
      resetCamera,

      // Persistence
      saveImprint,
      loadImprint,
      exportRender,
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
      updateDesignTransform,
      updateDesignOpacity,
      removeDesign,
      selectDesign,
      resetCamera,
      saveImprint,
      loadImprint,
      exportRender,
      handleSetImprintName,
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
