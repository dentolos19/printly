"use client";

import type { Design } from "@/lib/server/design";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type {
  AppliedDesign,
  CameraState,
  ImprinterData,
  LeftPanelView,
  PrintArea,
  ProductModel,
  SaveStatus,
  Tool,
  Transform3D,
} from "../../types";

const IMPRINTER_DATA_VERSION = "1.0";
const AUTO_SAVE_DELAY = 3000; // 3 seconds

type ImprinterContextValue = {
  // Product state
  productModel: ProductModel;
  productColor: string;
  appliedDesigns: AppliedDesign[];
  selectedDesignId: string | null;

  // UI state
  activeTool: Tool;
  leftPanelView: LeftPanelView;
  rightPanelOpen: boolean;

  // Camera state
  cameraState: CameraState;

  // Design persistence
  imprintId: string | null;
  imprintName: string;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  isDirty: boolean;

  // Product actions
  changeProductModel: (model: ProductModel) => void;
  changeProductColor: (color: string) => void;

  // Design actions
  addDesignToProduct: (design: Design, printArea: PrintArea) => void;
  updateDesignTransform: (id: string, transform: Partial<Transform3D>) => void;
  removeDesign: (id: string) => void;
  selectDesign: (id: string | null) => void;

  // UI actions
  setActiveTool: (tool: Tool) => void;
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
  onSave?: (data: { name: string; data: string }) => Promise<{ id: string }>;
  onLoad?: (id: string) => Promise<{ name: string; data: string }>;
};

export function ImprinterProvider({
  children,
  initialImprintId = null,
  initialImprintName = "Untitled Imprint",
  onSave,
  onLoad,
}: ImprinterProviderProps) {
  // Product state
  const [productModel, setProductModel] = useState<ProductModel>("tshirt");
  const [productColor, setProductColor] = useState("#ffffff");
  const [appliedDesigns, setAppliedDesigns] = useState<AppliedDesign[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // UI state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>("designs");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [0, 0, 5],
    target: [0, 0, 0],
  });

  // Design persistence state
  const [imprintId, setImprintId] = useState<string | null>(initialImprintId);
  const [imprintName, setImprintName] = useState(initialImprintName);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Auto-save functionality
  // ============================================================================

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setIsDirty(true);

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (onSave) {
        setSaveStatus("saving");
        const imprintData: ImprinterData = {
          version: IMPRINTER_DATA_VERSION,
          productModel,
          productColor,
          appliedDesigns,
          cameraState,
        };

        onSave({ name: imprintName, data: JSON.stringify(imprintData) })
          .then((result) => {
            if (result.id && !imprintId) {
              setImprintId(result.id);
            }
            setSaveStatus("saved");
            setLastSavedAt(new Date());
            setIsDirty(false);
          })
          .catch(() => {
            setSaveStatus("error");
          });
      }
    }, AUTO_SAVE_DELAY);
  }, [appliedDesigns, cameraState, imprintId, imprintName, onSave, productColor, productModel]);

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

  const saveImprint = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (!onSave) {
        resolve();
        return;
      }

      setSaveStatus("saving");
      const imprintData: ImprinterData = {
        version: IMPRINTER_DATA_VERSION,
        productModel,
        productColor,
        appliedDesigns,
        cameraState,
      };

      onSave({ name: imprintName, data: JSON.stringify(imprintData) })
        .then((result) => {
          if (result.id && !imprintId) {
            setImprintId(result.id);
          }
          setSaveStatus("saved");
          setLastSavedAt(new Date());
          setIsDirty(false);
          resolve();
        })
        .catch((error) => {
          setSaveStatus("error");
          reject(error);
        });
    });
  }, [appliedDesigns, cameraState, imprintId, imprintName, onSave, productColor, productModel]);

  const loadImprint = useCallback(
    (id: string) => {
      return new Promise<void>((resolve, reject) => {
        if (!onLoad) {
          resolve();
          return;
        }

        onLoad(id)
          .then((result) => {
            const data: ImprinterData = JSON.parse(result.data);
            setImprintId(id);
            setImprintName(result.name);
            setProductModel(data.productModel);
            setProductColor(data.productColor);
            setAppliedDesigns(data.appliedDesigns);
            setCameraState(data.cameraState);
            setSaveStatus("saved");
            setLastSavedAt(new Date());
            setIsDirty(false);
            resolve();
          })
          .catch(reject);
      });
    },
    [onLoad],
  );

  const exportRender = useCallback((resolution: number) => {
    // TODO: Implement 3D render export using Three.js render to canvas
    console.log("Export render at resolution:", resolution);
  }, []);

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

      // UI state
      activeTool,
      leftPanelView,
      rightPanelOpen,

      // Camera state
      cameraState,

      // Design persistence
      imprintId,
      imprintName,
      saveStatus,
      lastSavedAt,
      isDirty,

      // Product actions
      changeProductModel,
      changeProductColor,

      // Design actions
      addDesignToProduct,
      updateDesignTransform,
      removeDesign,
      selectDesign,

      // UI actions
      setActiveTool,
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
      activeTool,
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
      addDesignToProduct,
      updateDesignTransform,
      removeDesign,
      selectDesign,
      resetCamera,
      saveImprint,
      loadImprint,
      exportRender,
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
