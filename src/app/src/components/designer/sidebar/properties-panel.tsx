"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FabricObject, Textbox } from "fabric";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  FlipHorizontal,
  FlipVertical,
  Italic,
  MousePointer2,
  RotateCw,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ColorPicker } from "../color-picker";
import { useDesigner } from "../hooks/use-designer";

const FONT_FAMILIES = [
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
  "Comic Sans MS",
  "Impact",
  "Trebuchet MS",
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96];

type ObjectProperties = {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  // Text-specific
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  underline?: boolean;
  linethrough?: boolean;
  textAlign?: string;
};

export const PropertiesPanel = () => {
  const { canvas, selectedObjects, saveHistory } = useDesigner();
  const [properties, setProperties] = useState<ObjectProperties | null>(null);

  const selectedObject = selectedObjects[0] as FabricObject | undefined;
  const isTextObject =
    selectedObject?.type === "textbox" || selectedObject?.type === "text" || selectedObject?.type === "i-text";

  // Sync properties from selected object
  useEffect(() => {
    if (!selectedObject) {
      setProperties(null);
      return;
    }

    const obj = selectedObject;
    const textObj = obj as Textbox;

    setProperties({
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      angle: Math.round(obj.angle || 0),
      opacity: Math.round((obj.opacity || 1) * 100),
      fill: (obj.fill as string) || "#000000",
      stroke: (obj.stroke as string) || "transparent",
      strokeWidth: obj.strokeWidth || 0,
      // Text properties
      fontFamily: textObj.fontFamily,
      fontSize: textObj.fontSize,
      fontWeight: textObj.fontWeight,
      fontStyle: textObj.fontStyle,
      underline: textObj.underline,
      linethrough: textObj.linethrough,
      textAlign: textObj.textAlign,
    });
  }, [selectedObject]);

  const updateObject = useCallback(
    (key: string, value: unknown) => {
      if (!canvas || !selectedObject) return;

      if (key === "width") {
        const originalWidth = selectedObject.width || 1;
        selectedObject.set({ scaleX: (value as number) / originalWidth });
      } else if (key === "height") {
        const originalHeight = selectedObject.height || 1;
        selectedObject.set({ scaleY: (value as number) / originalHeight });
      } else if (key === "opacity") {
        selectedObject.set({ opacity: (value as number) / 100 });
      } else {
        selectedObject.set({ [key]: value });
      }

      selectedObject.setCoords();
      canvas.renderAll();
    },
    [canvas, selectedObject],
  );

  const handlePropertyChange = useCallback(
    (key: string, value: unknown) => {
      updateObject(key, value);
      setProperties((prev) => (prev ? { ...prev, [key]: value } : null));
    },
    [updateObject],
  );

  const handlePropertyBlur = useCallback(() => {
    saveHistory();
  }, [saveHistory]);

  const handleRotate = useCallback(
    (degrees: number) => {
      if (!selectedObject) return;
      const currentAngle = selectedObject.angle || 0;
      handlePropertyChange("angle", (currentAngle + degrees) % 360);
      saveHistory();
    },
    [selectedObject, handlePropertyChange, saveHistory],
  );

  const handleFlip = useCallback(
    (direction: "horizontal" | "vertical") => {
      if (!canvas || !selectedObject) return;

      if (direction === "horizontal") {
        selectedObject.set({ flipX: !selectedObject.flipX });
      } else {
        selectedObject.set({ flipY: !selectedObject.flipY });
      }

      canvas.renderAll();
      saveHistory();
    },
    [canvas, selectedObject, saveHistory],
  );

  if (!selectedObject || !properties) {
    return (
      <div className={"flex h-full flex-col items-center justify-center p-4"}>
        <MousePointer2 className={"text-muted-foreground/50 h-12 w-12"} />
        <p className={"text-muted-foreground mt-2 text-center text-sm"}>No selection</p>
        <p className={"text-muted-foreground text-center text-xs"}>Select an element to edit its properties</p>
      </div>
    );
  }

  return (
    <ScrollArea className={"h-full"}>
      <div className={"flex flex-col gap-4 p-3"}>
        {/* Position */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Position</Label>
          <div className={"grid grid-cols-2 gap-2"}>
            <div>
              <Label className={"text-muted-foreground text-xs"}>X</Label>
              <Input
                type={"number"}
                value={properties.left}
                onChange={(e) => handlePropertyChange("left", parseInt(e.target.value, 10) || 0)}
                onBlur={handlePropertyBlur}
                className={"h-8"}
              />
            </div>
            <div>
              <Label className={"text-muted-foreground text-xs"}>Y</Label>
              <Input
                type={"number"}
                value={properties.top}
                onChange={(e) => handlePropertyChange("top", parseInt(e.target.value, 10) || 0)}
                onBlur={handlePropertyBlur}
                className={"h-8"}
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Size</Label>
          <div className={"grid grid-cols-2 gap-2"}>
            <div>
              <Label className={"text-muted-foreground text-xs"}>Width</Label>
              <Input
                type={"number"}
                value={properties.width}
                onChange={(e) => handlePropertyChange("width", parseInt(e.target.value, 10) || 1)}
                onBlur={handlePropertyBlur}
                className={"h-8"}
              />
            </div>
            <div>
              <Label className={"text-muted-foreground text-xs"}>Height</Label>
              <Input
                type={"number"}
                value={properties.height}
                onChange={(e) => handlePropertyChange("height", parseInt(e.target.value, 10) || 1)}
                onBlur={handlePropertyBlur}
                className={"h-8"}
              />
            </div>
          </div>
        </div>

        {/* Rotation & Flip */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Transform</Label>
          <div className={"flex items-center gap-2"}>
            <div className={"flex-1"}>
              <Label className={"text-muted-foreground text-xs"}>Angle</Label>
              <Input
                type={"number"}
                value={properties.angle}
                onChange={(e) => handlePropertyChange("angle", parseInt(e.target.value, 10) || 0)}
                onBlur={handlePropertyBlur}
                className={"h-8"}
              />
            </div>
            <div className={"flex items-end gap-1"}>
              <Button variant={"outline"} size={"icon"} className={"h-8 w-8"} onClick={() => handleRotate(90)}>
                <RotateCw className={"h-4 w-4"} />
              </Button>
              <Button variant={"outline"} size={"icon"} className={"h-8 w-8"} onClick={() => handleFlip("horizontal")}>
                <FlipHorizontal className={"h-4 w-4"} />
              </Button>
              <Button variant={"outline"} size={"icon"} className={"h-8 w-8"} onClick={() => handleFlip("vertical")}>
                <FlipVertical className={"h-4 w-4"} />
              </Button>
            </div>
          </div>
        </div>

        {/* Opacity */}
        <div className={"flex flex-col gap-2"}>
          <div className={"flex items-center justify-between"}>
            <Label className={"text-xs font-medium"}>Opacity</Label>
            <span className={"text-muted-foreground text-xs"}>{properties.opacity}%</span>
          </div>
          <Slider
            value={[properties.opacity]}
            onValueChange={([value]) => handlePropertyChange("opacity", value)}
            onValueCommit={handlePropertyBlur}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <Separator />

        {/* Colors */}
        <div className={"flex flex-col gap-3"}>
          <Label className={"text-xs font-medium"}>Appearance</Label>

          <ColorPicker
            label={"Fill"}
            color={properties.fill}
            onChange={(color) => {
              handlePropertyChange("fill", color);
              saveHistory();
            }}
          />

          <ColorPicker
            label={"Stroke"}
            color={properties.stroke}
            onChange={(color) => {
              handlePropertyChange("stroke", color);
              saveHistory();
            }}
          />

          <div>
            <Label className={"text-muted-foreground text-xs"}>Stroke Width</Label>
            <Slider
              value={[properties.strokeWidth]}
              onValueChange={([value]) => handlePropertyChange("strokeWidth", value)}
              onValueCommit={handlePropertyBlur}
              min={0}
              max={20}
              step={1}
            />
          </div>
        </div>

        {/* Text Properties */}
        {isTextObject && (
          <>
            <Separator />

            <div className={"flex flex-col gap-3"}>
              <Label className={"text-xs font-medium"}>Typography</Label>

              <div>
                <Label className={"text-muted-foreground text-xs"}>Font Family</Label>
                <Select
                  value={properties.fontFamily}
                  onValueChange={(value) => {
                    handlePropertyChange("fontFamily", value);
                    saveHistory();
                  }}
                >
                  <SelectTrigger className={"h-8"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={"text-muted-foreground text-xs"}>Font Size</Label>
                <Select
                  value={properties.fontSize?.toString()}
                  onValueChange={(value) => {
                    handlePropertyChange("fontSize", parseInt(value, 10));
                    saveHistory();
                  }}
                >
                  <SelectTrigger className={"h-8"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={"text-muted-foreground text-xs"}>Style</Label>
                <ToggleGroup
                  type={"multiple"}
                  className={"justify-start"}
                  value={[
                    properties.fontWeight === "bold" ? "bold" : "",
                    properties.fontStyle === "italic" ? "italic" : "",
                    properties.underline ? "underline" : "",
                    properties.linethrough ? "linethrough" : "",
                  ].filter(Boolean)}
                  onValueChange={(values) => {
                    handlePropertyChange("fontWeight", values.includes("bold") ? "bold" : "normal");
                    handlePropertyChange("fontStyle", values.includes("italic") ? "italic" : "normal");
                    handlePropertyChange("underline", values.includes("underline"));
                    handlePropertyChange("linethrough", values.includes("linethrough"));
                    saveHistory();
                  }}
                >
                  <ToggleGroupItem value={"bold"} className={"h-8 w-8 p-0"}>
                    <Bold className={"h-4 w-4"} />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={"italic"} className={"h-8 w-8 p-0"}>
                    <Italic className={"h-4 w-4"} />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={"underline"} className={"h-8 w-8 p-0"}>
                    <Underline className={"h-4 w-4"} />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={"linethrough"} className={"h-8 w-8 p-0"}>
                    <Strikethrough className={"h-4 w-4"} />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div>
                <Label className={"text-muted-foreground text-xs"}>Text Align</Label>
                <ToggleGroup
                  type={"single"}
                  className={"justify-start"}
                  value={properties.textAlign || "left"}
                  onValueChange={(value) => {
                    if (value) {
                      handlePropertyChange("textAlign", value);
                      saveHistory();
                    }
                  }}
                >
                  <ToggleGroupItem value={"left"} className={"h-8 w-8 p-0"}>
                    <AlignLeft className={"h-4 w-4"} />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={"center"} className={"h-8 w-8 p-0"}>
                    <AlignCenter className={"h-4 w-4"} />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={"right"} className={"h-8 w-8 p-0"}>
                    <AlignRight className={"h-4 w-4"} />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={"justify"} className={"h-8 w-8 p-0"}>
                    <AlignJustify className={"h-4 w-4"} />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};
