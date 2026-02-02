"use client";

import type { FabricObject } from "fabric";
import {
  ActiveSelection,
  Canvas,
  Circle,
  FabricImage,
  Group,
  Line,
  PencilBrush,
  Rect,
  Textbox,
  Triangle,
} from "fabric";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAutoSave } from "../../../shared/hooks/use-auto-save";
import type {
  AlignmentType,
  ArtStyle,
  CanvasSize,
  DesignerContextValue,
  DistributionType,
  ExportFormat,
  GeneratedImage,
  HistoryState,
  LayerItem,
  ToolType,
} from "../../types";
import { DEFAULT_CANVAS_SIZE, DESIGN_DATA_VERSION } from "../../types";

const DesignerContext = createContext<DesignerContextValue | null>(null);

const MAX_HISTORY_SIZE = 50;

type DesignerProviderProps = {
  children: ReactNode;
  initialDesignId?: string | null;
  initialDesignName?: string;
  initialGeneratedImages?: GeneratedImage[];
  onSave?: (data: { name: string; data: string; cover?: string }) => Promise<{ id: string }>;
  onLoad?: (id: string) => Promise<{ name: string; data: string }>;
  onGenerateImage?: (prompt: string, style?: ArtStyle) => Promise<{ url: string; assetId: string }>;
};

export function DesignerProvider({
  children,
  initialDesignId = null,
  initialDesignName = "Untitled Design",
  initialGeneratedImages = [],
  onSave,
  onLoad,
  onGenerateImage,
}: DesignerProviderProps) {
  // Canvas state
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<FabricObject[]>([]);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(DEFAULT_CANVAS_SIZE);
  const [zoom, setZoom] = useState(0.25);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20);

  // History state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryAction = useRef(false);

  // Design persistence state
  const [designName, setDesignName] = useState(initialDesignName);

  // AI Generator state
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(initialGeneratedImages);
  const [isGenerating, setIsGenerating] = useState(false);

  // Clipboard state
  const [clipboard, setClipboard] = useState<FabricObject[]>([]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Serialize function for auto-save
  const serializeDesign = useCallback(() => {
    if (!canvas) return {};

    const cover = canvas.toDataURL({
      format: "png",
      multiplier: 2,
    });

    return {
      cover,
      version: DESIGN_DATA_VERSION,
      canvasSize,
      backgroundColor: canvas.backgroundColor,
      objects: canvas.toJSON().objects,
    };
  }, [canvas, canvasSize]);

  // Use shared auto-save hook
  const {
    saveStatus,
    lastSavedAt,
    isDirty,
    triggerAutoSave,
    saveNow,
    setId: setDesignIdInternal,
  } = useAutoSave({
    id: initialDesignId,
    name: designName,
    serialize: serializeDesign,
    onSave,
    onIdChange: (id) => setDesignId(id),
  });

  // Track designId from auto-save hook
  const [designId, setDesignId] = useState<string | null>(initialDesignId);

  // ============================================================================
  // History management
  // ============================================================================

  const saveHistory = useCallback(() => {
    if (!canvas || isHistoryAction.current) return;

    const json = JSON.stringify(canvas.toJSON());
    const newState: HistoryState = {
      json,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      // Limit history size
      return newHistory.length > MAX_HISTORY_SIZE ? newHistory.slice(1) : newHistory;
    });

    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    triggerAutoSave();
  }, [canvas, historyIndex, triggerAutoSave]);

  const undo = useCallback(() => {
    if (!canvas || !canUndo) return;

    isHistoryAction.current = true;
    const prevState = history[historyIndex - 1];

    canvas.loadFromJSON(prevState.json).then(() => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev - 1);
      isHistoryAction.current = false;
      triggerAutoSave();
    });
  }, [canvas, canUndo, history, historyIndex, triggerAutoSave]);

  const redo = useCallback(() => {
    if (!canvas || !canRedo) return;

    isHistoryAction.current = true;
    const nextState = history[historyIndex + 1];

    canvas.loadFromJSON(nextState.json).then(() => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev + 1);
      isHistoryAction.current = false;
      triggerAutoSave();
    });
  }, [canvas, canRedo, history, historyIndex, triggerAutoSave]);

  // ============================================================================
  // Design persistence
  // ============================================================================

  const saveDesign = saveNow;

  const loadDesign = useCallback(
    (id: string) => {
      return new Promise<void>((resolve, reject) => {
        if (!onLoad || !canvas) {
          resolve();
          return;
        }

        onLoad(id)
          .then((result) => {
            setDesignId(id);
            setDesignName(result.name);

            const data = JSON.parse(result.data);
            if (data.canvasSize) {
              setCanvasSize(data.canvasSize);
            }
            if (data.backgroundColor) {
              canvas.backgroundColor = data.backgroundColor;
            }

            return canvas.loadFromJSON({ objects: data.objects });
          })
          .then(() => {
            canvas.renderAll();
            resolve();
          })
          .catch(reject);
      });
    },
    [canvas, onLoad],
  );

  // ============================================================================
  // Layer management
  // ============================================================================

  const updateLayers = useCallback(() => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const newLayers: LayerItem[] = objects.map((obj, index) => ({
      id: (obj as FabricObject & { id?: string }).id || `layer-${index}`,
      name: (obj as FabricObject & { name?: string }).name || `${obj.type} ${index + 1}`,
      type: obj.type || "object",
      visible: obj.visible !== false,
      locked: !obj.selectable,
      object: obj,
    }));

    setLayers(newLayers.reverse());
  }, [canvas]);

  // ============================================================================
  // Object creation
  // ============================================================================

  const addText = useCallback(
    (text = "Double-click to edit") => {
      if (!canvas) return;

      const textbox = new Textbox(text, {
        left: canvasSize.width / 2 - 100,
        top: canvasSize.height / 2 - 20,
        width: 200,
        fontSize: 48,
        fontFamily: "Inter, sans-serif",
        fill: "#000000",
        textAlign: "center",
      });

      (textbox as unknown as { id: string }).id = `text-${Date.now()}`;
      (textbox as unknown as { name: string }).name = "Text Layer";

      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      canvas.renderAll();
      updateLayers();
      saveHistory();
    },
    [canvas, canvasSize, updateLayers, saveHistory],
  );

  const addRectangle = useCallback(() => {
    if (!canvas) return;

    const rect = new Rect({
      left: canvasSize.width / 2 - 100,
      top: canvasSize.height / 2 - 100,
      width: 200,
      height: 200,
      fill: "#3b82f6",
      stroke: "#1d4ed8",
      strokeWidth: 2,
      rx: 8,
      ry: 8,
    });

    (rect as unknown as { id: string }).id = `rect-${Date.now()}`;
    (rect as unknown as { name: string }).name = "Rectangle";

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, canvasSize, updateLayers, saveHistory]);

  const addCircle = useCallback(() => {
    if (!canvas) return;

    const circle = new Circle({
      left: canvasSize.width / 2 - 100,
      top: canvasSize.height / 2 - 100,
      radius: 100,
      fill: "#10b981",
      stroke: "#059669",
      strokeWidth: 2,
    });

    (circle as unknown as { id: string }).id = `circle-${Date.now()}`;
    (circle as unknown as { name: string }).name = "Circle";

    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, canvasSize, updateLayers, saveHistory]);

  const addTriangle = useCallback(() => {
    if (!canvas) return;

    const triangle = new Triangle({
      left: canvasSize.width / 2 - 100,
      top: canvasSize.height / 2 - 100,
      width: 200,
      height: 200,
      fill: "#f59e0b",
      stroke: "#d97706",
      strokeWidth: 2,
    });

    (triangle as unknown as { id: string }).id = `triangle-${Date.now()}`;
    (triangle as unknown as { name: string }).name = "Triangle";

    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, canvasSize, updateLayers, saveHistory]);

  const addLine = useCallback(() => {
    if (!canvas) return;

    const line = new Line(
      [canvasSize.width / 2 - 100, canvasSize.height / 2, canvasSize.width / 2 + 100, canvasSize.height / 2],
      {
        stroke: "#000000",
        strokeWidth: 4,
      },
    );

    (line as unknown as { id: string }).id = `line-${Date.now()}`;
    (line as unknown as { name: string }).name = "Line";

    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, canvasSize, updateLayers, saveHistory]);

  const addImage = useCallback(
    (url: string) => {
      if (!canvas) return;

      FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
        const maxWidth = canvasSize.width * 0.8;
        const maxHeight = canvasSize.height * 0.8;
        const scale = Math.min(maxWidth / (img.width || 1), maxHeight / (img.height || 1), 1);

        img.set({
          left: canvasSize.width / 2 - ((img.width || 0) * scale) / 2,
          top: canvasSize.height / 2 - ((img.height || 0) * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });

        (img as unknown as { id: string }).id = `image-${Date.now()}`;
        (img as unknown as { name: string }).name = "Image";

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        updateLayers();
        saveHistory();
      });
    },
    [canvas, canvasSize, updateLayers, saveHistory],
  );

  const setDrawingMode = useCallback(
    (enabled: boolean, color = "#000000", width = 5) => {
      if (!canvas) return;

      canvas.isDrawingMode = enabled;
      if (enabled) {
        const brush = new PencilBrush(canvas);
        brush.color = color;
        brush.width = width;
        canvas.freeDrawingBrush = brush;
      }
      canvas.renderAll();
    },
    [canvas],
  );

  // ============================================================================
  // Object manipulation
  // ============================================================================

  const deleteSelected = useCallback(() => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    canvas.discardActiveObject();
    for (const obj of activeObjects) {
      canvas.remove(obj);
    }
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  const duplicateSelected = useCallback(() => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    canvas.discardActiveObject();

    const clonePromises = activeObjects.map((obj) => obj.clone());

    Promise.all(clonePromises).then((clones) => {
      for (const clone of clones) {
        clone.set({
          left: (clone.left || 0) + 20,
          top: (clone.top || 0) + 20,
        });
        (clone as FabricObject & { id: string }).id = `clone-${Date.now()}`;
        canvas.add(clone);
      }

      if (clones.length === 1) {
        canvas.setActiveObject(clones[0]);
      } else {
        const selection = new ActiveSelection(clones, { canvas });
        canvas.setActiveObject(selection);
      }

      canvas.renderAll();
      updateLayers();
      saveHistory();
    });
  }, [canvas, updateLayers, saveHistory]);

  const groupSelected = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "activeselection") return;

    const selection = activeObject as ActiveSelection;
    const group = new Group(selection.getObjects());

    canvas.discardActiveObject();
    for (const obj of selection.getObjects()) {
      canvas.remove(obj);
    }

    (group as unknown as { id: string }).id = `group-${Date.now()}`;
    (group as unknown as { name: string }).name = "Group";

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  const ungroupSelected = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "group") return;

    const group = activeObject as Group;
    const objects = group.getObjects();

    canvas.discardActiveObject();
    canvas.remove(group);

    for (const obj of objects) {
      canvas.add(obj);
    }

    const selection = new ActiveSelection(objects, { canvas });
    canvas.setActiveObject(selection);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  // ============================================================================
  // Clipboard operations
  // ============================================================================

  const copySelected = useCallback(() => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    const clonePromises = activeObjects.map((obj) => obj.clone());
    Promise.all(clonePromises).then((clones) => {
      setClipboard(clones);
    });
  }, [canvas]);

  const cutSelected = useCallback(() => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    const clonePromises = activeObjects.map((obj) => obj.clone());
    Promise.all(clonePromises).then((clones) => {
      setClipboard(clones);
      canvas.discardActiveObject();
      for (const obj of activeObjects) {
        canvas.remove(obj);
      }
      canvas.renderAll();
      updateLayers();
      saveHistory();
    });
  }, [canvas, updateLayers, saveHistory]);

  const paste = useCallback(() => {
    if (!canvas || clipboard.length === 0) return;

    canvas.discardActiveObject();

    const clonePromises = clipboard.map((obj) => obj.clone());
    Promise.all(clonePromises).then((clones) => {
      for (const clone of clones) {
        clone.set({
          left: (clone.left || 0) + 20,
          top: (clone.top || 0) + 20,
        });
        (clone as FabricObject & { id: string }).id = `paste-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        canvas.add(clone);
      }

      if (clones.length === 1) {
        canvas.setActiveObject(clones[0]);
      } else {
        const selection = new ActiveSelection(clones, { canvas });
        canvas.setActiveObject(selection);
      }

      // Update clipboard with offset for next paste
      const newClipboardPromises = clones.map((obj) => obj.clone());
      Promise.all(newClipboardPromises).then((newClones) => {
        setClipboard(newClones);
      });

      canvas.renderAll();
      updateLayers();
      saveHistory();
    });
  }, [canvas, clipboard, updateLayers, saveHistory]);

  // ============================================================================
  // Selection helpers
  // ============================================================================

  const selectAll = useCallback(() => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length === 0) return;

    canvas.discardActiveObject();
    const selection = new ActiveSelection(objects, { canvas });
    canvas.setActiveObject(selection);
    canvas.renderAll();
  }, [canvas]);

  const deselectAll = useCallback(() => {
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  // ============================================================================
  // Alignment & Distribution
  // ============================================================================

  const alignObjects = useCallback(
    (alignment: AlignmentType) => {
      if (!canvas) return;

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length < 2) return;

      const bounds = {
        left: Math.min(...activeObjects.map((obj) => obj.left || 0)),
        top: Math.min(...activeObjects.map((obj) => obj.top || 0)),
        right: Math.max(...activeObjects.map((obj) => (obj.left || 0) + (obj.width || 0) * (obj.scaleX || 1))),
        bottom: Math.max(...activeObjects.map((obj) => (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1))),
      };

      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.top + bounds.bottom) / 2;

      for (const obj of activeObjects) {
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);

        switch (alignment) {
          case "left":
            obj.set({ left: bounds.left });
            break;
          case "center":
            obj.set({ left: centerX - objWidth / 2 });
            break;
          case "right":
            obj.set({ left: bounds.right - objWidth });
            break;
          case "top":
            obj.set({ top: bounds.top });
            break;
          case "middle":
            obj.set({ top: centerY - objHeight / 2 });
            break;
          case "bottom":
            obj.set({ top: bounds.bottom - objHeight });
            break;
        }
      }

      canvas.renderAll();
      saveHistory();
    },
    [canvas, saveHistory],
  );

  const distributeObjects = useCallback(
    (distribution: DistributionType) => {
      if (!canvas) return;

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length < 3) return;

      const sorted = [...activeObjects].sort((a, b) => {
        if (distribution === "horizontal") {
          return (a.left || 0) - (b.left || 0);
        }
        return (a.top || 0) - (b.top || 0);
      });

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      if (distribution === "horizontal") {
        const totalWidth = (last.left || 0) + (last.width || 0) * (last.scaleX || 1) - (first.left || 0);
        const objectsWidth = sorted.reduce((sum, obj) => sum + (obj.width || 0) * (obj.scaleX || 1), 0);
        const spacing = (totalWidth - objectsWidth) / (sorted.length - 1);

        let currentX = first.left || 0;
        for (const obj of sorted) {
          obj.set({ left: currentX });
          currentX += (obj.width || 0) * (obj.scaleX || 1) + spacing;
        }
      } else {
        const totalHeight = (last.top || 0) + (last.height || 0) * (last.scaleY || 1) - (first.top || 0);
        const objectsHeight = sorted.reduce((sum, obj) => sum + (obj.height || 0) * (obj.scaleY || 1), 0);
        const spacing = (totalHeight - objectsHeight) / (sorted.length - 1);

        let currentY = first.top || 0;
        for (const obj of sorted) {
          obj.set({ top: currentY });
          currentY += (obj.height || 0) * (obj.scaleY || 1) + spacing;
        }
      }

      canvas.renderAll();
      saveHistory();
    },
    [canvas, saveHistory],
  );

  // ============================================================================
  // Layer ordering
  // ============================================================================

  const bringForward = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.bringObjectForward(activeObject);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  const sendBackward = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.sendObjectBackwards(activeObject);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  const bringToFront = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.bringObjectToFront(activeObject);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  const sendToBack = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.sendObjectToBack(activeObject);
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  // ============================================================================
  // Export
  // ============================================================================

  const exportCanvas = useCallback(
    (format: ExportFormat) => {
      if (!canvas) return;

      let data: string;
      let filename: string;

      switch (format) {
        case "png":
          data = canvas.toDataURL({ format: "png", multiplier: 2 });
          filename = `${designName}-${Date.now()}.png`;
          break;
        case "jpg":
          data = canvas.toDataURL({
            format: "jpeg",
            quality: 0.9,
            multiplier: 2,
          });
          filename = `${designName}-${Date.now()}.jpg`;
          break;
        case "svg":
          data = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(canvas.toSVG())}`;
          filename = `${designName}-${Date.now()}.svg`;
          break;
        case "json":
          data = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(canvas.toJSON(), null, 2))}`;
          filename = `${designName}-${Date.now()}.json`;
          break;
      }

      const link = document.createElement("a");
      link.href = data;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [canvas, designName],
  );

  const clearCanvas = useCallback(() => {
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

  // ============================================================================
  // Zoom controls
  // ============================================================================

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.25, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.25, 0.1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const fitToScreen = useCallback(() => {
    const container = document.querySelector("[data-canvas-container]");
    if (!container) {
      setZoom(0.25);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const padding = 80;
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2;

    const scaleX = availableWidth / canvasSize.width;
    const scaleY = availableHeight / canvasSize.height;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(Math.max(newZoom, 0.1));
  }, [canvasSize]);

  // ============================================================================
  // Resize design
  // ============================================================================

  const resizeDesign = useCallback(
    (newSize: CanvasSize, scaleContent = false) => {
      if (!canvas) return;

      if (scaleContent) {
        const scaleX = newSize.width / canvasSize.width;
        const scaleY = newSize.height / canvasSize.height;

        const objects = canvas.getObjects();
        for (const obj of objects) {
          obj.set({
            left: (obj.left || 0) * scaleX,
            top: (obj.top || 0) * scaleY,
            scaleX: (obj.scaleX || 1) * scaleX,
            scaleY: (obj.scaleY || 1) * scaleY,
          });
          obj.setCoords();
        }
      }

      setCanvasSize(newSize);
      canvas.setDimensions(newSize);
      canvas.renderAll();
      saveHistory();
    },
    [canvas, canvasSize, saveHistory],
  );

  // ============================================================================
  // AI Generator
  // ============================================================================

  const generateImage = useCallback(
    (prompt: string, style?: ArtStyle) => {
      return new Promise<void>((resolve, reject) => {
        if (!onGenerateImage) {
          reject(new Error("Image generation not configured"));
          return;
        }

        setIsGenerating(true);

        onGenerateImage(prompt, style)
          .then(({ url, assetId }) => {
            const newImage: GeneratedImage = {
              id: assetId,
              url,
              prompt,
              style,
              createdAt: new Date(),
            };
            setGeneratedImages((prev) => [newImage, ...prev]);
            setIsGenerating(false);
            resolve();
          })
          .catch((error) => {
            setIsGenerating(false);
            reject(error);
          });
      });
    },
    [onGenerateImage],
  );

  // ============================================================================
  // Initial design loading
  // ============================================================================

  const hasLoadedInitialDesign = useRef(false);

  useEffect(() => {
    // Load the design when canvas is ready and we have an initial design ID
    if (canvas && initialDesignId && onLoad && !hasLoadedInitialDesign.current) {
      hasLoadedInitialDesign.current = true;

      onLoad(initialDesignId)
        .then((result) => {
          setDesignName(result.name);

          const data = JSON.parse(result.data);
          if (data.canvasSize) {
            setCanvasSize(data.canvasSize);
            // Update canvas dimensions
            canvas.setDimensions({
              width: data.canvasSize.width,
              height: data.canvasSize.height,
            });
          }
          if (data.backgroundColor) {
            canvas.backgroundColor = data.backgroundColor;
          }

          // Load objects onto the canvas
          return canvas.loadFromJSON({ objects: data.objects || [] });
        })
        .then(() => {
          canvas.renderAll();
          // Save initial state to history
          saveHistory();
        })
        .catch((error) => {
          console.error("Failed to load design:", error);
        });
    }
  }, [canvas, initialDesignId, onLoad, saveHistory]);

  // ============================================================================
  // Context value
  // ============================================================================

  const value = useMemo<DesignerContextValue>(
    () => ({
      canvas,
      setCanvas,
      selectedObjects,
      setSelectedObjects,
      layers,
      setLayers,
      activeTool,
      setActiveTool,
      canvasSize,
      setCanvasSize,
      zoom,
      setZoom,
      gridEnabled,
      setGridEnabled,
      gridSize,
      setGridSize,
      history,
      historyIndex,
      canUndo,
      canRedo,
      saveHistory,
      undo,
      redo,
      designId,
      designName,
      setDesignName,
      saveStatus,
      lastSavedAt,
      isDirty,
      saveDesign,
      loadDesign,
      addText,
      addRectangle,
      addCircle,
      addTriangle,
      addLine,
      addImage,
      setDrawingMode,
      deleteSelected,
      duplicateSelected,
      groupSelected,
      ungroupSelected,
      copySelected,
      cutSelected,
      paste,
      selectAll,
      deselectAll,
      alignObjects,
      distributeObjects,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      exportCanvas,
      clearCanvas,
      zoomIn,
      zoomOut,
      resetZoom,
      fitToScreen,
      resizeDesign,
      generatedImages,
      isGenerating,
      generateImage,
    }),
    [
      canvas,
      selectedObjects,
      layers,
      activeTool,
      canvasSize,
      zoom,
      gridEnabled,
      gridSize,
      history,
      historyIndex,
      canUndo,
      canRedo,
      saveHistory,
      undo,
      redo,
      designId,
      designName,
      saveStatus,
      lastSavedAt,
      isDirty,
      saveDesign,
      loadDesign,
      addText,
      addRectangle,
      addCircle,
      addTriangle,
      addLine,
      addImage,
      setDrawingMode,
      deleteSelected,
      duplicateSelected,
      groupSelected,
      ungroupSelected,
      copySelected,
      cutSelected,
      paste,
      selectAll,
      deselectAll,
      alignObjects,
      distributeObjects,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      exportCanvas,
      clearCanvas,
      zoomIn,
      zoomOut,
      resetZoom,
      fitToScreen,
      resizeDesign,
      generatedImages,
      isGenerating,
      generateImage,
    ],
  );

  return <DesignerContext.Provider value={value}>{children}</DesignerContext.Provider>;
}

export function useDesigner(): DesignerContextValue {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error("useDesigner must be used within a DesignerProvider");
  }
  return context;
}
