"use client";

import type { FabricObject } from "fabric";
import { ActiveSelection, Canvas, Circle, FabricImage, Group, Line, Rect, Textbox, Triangle } from "fabric";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type {
  AlignmentType,
  CanvasSize,
  DesignerContextValue,
  DistributionType,
  ExportFormat,
  HistoryState,
  LayerItem,
  ToolType,
} from "../types";
import { DEFAULT_CANVAS_SIZE } from "../types";

const DesignerContext = createContext<DesignerContextValue | null>(null);

const MAX_HISTORY_SIZE = 50;

type DesignerProviderProps = {
  children: ReactNode;
};

export const DesignerProvider = ({ children }: DesignerProviderProps) => {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<FabricObject[]>([]);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(DEFAULT_CANVAS_SIZE);
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryAction = useRef(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [canvas, historyIndex]);

  const undo = useCallback(() => {
    if (!canvas || !canUndo) return;

    isHistoryAction.current = true;
    const prevState = history[historyIndex - 1];
    canvas.loadFromJSON(prevState.json).then(() => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev - 1);
      isHistoryAction.current = false;
    });
  }, [canvas, canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canvas || !canRedo) return;

    isHistoryAction.current = true;
    const nextState = history[historyIndex + 1];
    canvas.loadFromJSON(nextState.json).then(() => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev + 1);
      isHistoryAction.current = false;
    });
  }, [canvas, canRedo, history, historyIndex]);

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

  const addText = useCallback(
    (text = "Double-click to edit") => {
      if (!canvas) return;

      const textbox = new Textbox(text, {
        left: canvasSize.width / 2 - 100,
        top: canvasSize.height / 2 - 20,
        width: 200,
        fontSize: 24,
        fontFamily: "Inter, sans-serif",
        fill: "#000000",
        textAlign: "center",
      });

      (textbox as unknown as { id: string }).id = `text-${Date.now()}`;
      (textbox as unknown as { name: string }).name = "Text";

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
      left: canvasSize.width / 2 - 50,
      top: canvasSize.height / 2 - 50,
      width: 100,
      height: 100,
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
      left: canvasSize.width / 2 - 50,
      top: canvasSize.height / 2 - 50,
      radius: 50,
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
      left: canvasSize.width / 2 - 50,
      top: canvasSize.height / 2 - 50,
      width: 100,
      height: 100,
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
      [canvasSize.width / 2 - 50, canvasSize.height / 2, canvasSize.width / 2 + 50, canvasSize.height / 2],
      {
        stroke: "#000000",
        strokeWidth: 3,
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

  const exportCanvas = useCallback(
    (format: ExportFormat) => {
      if (!canvas) return;

      let data: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case "png":
          data = canvas.toDataURL({ format: "png", multiplier: 2 });
          filename = `design-${Date.now()}.png`;
          mimeType = "image/png";
          break;
        case "jpg":
          data = canvas.toDataURL({
            format: "jpeg",
            quality: 0.9,
            multiplier: 2,
          });
          filename = `design-${Date.now()}.jpg`;
          mimeType = "image/jpeg";
          break;
        case "svg":
          data = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(canvas.toSVG())}`;
          filename = `design-${Date.now()}.svg`;
          mimeType = "image/svg+xml";
          break;
        case "json":
          data = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(canvas.toJSON(), null, 2))}`;
          filename = `design-${Date.now()}.json`;
          mimeType = "application/json";
          break;
      }

      const link = document.createElement("a");
      link.href = data;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [canvas],
  );

  const clearCanvas = useCallback(() => {
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    updateLayers();
    saveHistory();
  }, [canvas, updateLayers, saveHistory]);

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
      addText,
      addRectangle,
      addCircle,
      addTriangle,
      addLine,
      addImage,
      deleteSelected,
      duplicateSelected,
      groupSelected,
      ungroupSelected,
      alignObjects,
      distributeObjects,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      exportCanvas,
      clearCanvas,
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
      addText,
      addRectangle,
      addCircle,
      addTriangle,
      addLine,
      addImage,
      deleteSelected,
      duplicateSelected,
      groupSelected,
      ungroupSelected,
      alignObjects,
      distributeObjects,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      exportCanvas,
      clearCanvas,
    ],
  );

  return <DesignerContext.Provider value={value}>{children}</DesignerContext.Provider>;
};

export const useDesigner = (): DesignerContextValue => {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error("useDesigner must be used within a DesignerProvider");
  }
  return context;
};
