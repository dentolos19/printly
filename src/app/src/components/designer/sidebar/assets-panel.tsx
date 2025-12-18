"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Circle,
  Heading1,
  Heading2,
  Minus,
  Quote,
  Square,
  Text as TextIcon,
  Triangle,
  Type,
  Upload,
} from "lucide-react";
import { useCallback, useRef } from "react";
import { useDesigner } from "../hooks/use-designer";

type ShapePreset = {
  icon: typeof Square;
  name: string;
  action: () => void;
};

type TextPreset = {
  icon: typeof Type;
  name: string;
  text: string;
  fontSize: number;
  fontWeight?: string;
};

export const AssetsPanel = () => {
  const { addText, addRectangle, addCircle, addTriangle, addLine, addImage, canvas, canvasSize, saveHistory } =
    useDesigner();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        addImage(url);
      };
      reader.readAsDataURL(file);

      e.target.value = "";
    },
    [addImage],
  );

  const handleAddText = useCallback(
    (preset: TextPreset) => {
      if (!canvas) return;

      const { Textbox } = require("fabric");

      const textbox = new Textbox(preset.text, {
        left: canvasSize.width / 2 - 100,
        top: canvasSize.height / 2 - 20,
        width: 200,
        fontSize: preset.fontSize,
        fontFamily: "Inter, sans-serif",
        fontWeight: preset.fontWeight || "normal",
        fill: "#000000",
        textAlign: "center",
      });

      (textbox as typeof textbox & { id: string }).id = `text-${Date.now()}`;
      (textbox as typeof textbox & { name: string }).name = preset.name;

      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      canvas.renderAll();
      saveHistory();
    },
    [canvas, canvasSize, saveHistory],
  );

  const shapePresets: ShapePreset[] = [
    { icon: Square, name: "Rectangle", action: addRectangle },
    { icon: Circle, name: "Circle", action: addCircle },
    { icon: Triangle, name: "Triangle", action: addTriangle },
    { icon: Minus, name: "Line", action: addLine },
  ];

  const textPresets: TextPreset[] = [
    { icon: Heading1, name: "Heading", text: "Add a heading", fontSize: 48, fontWeight: "bold" },
    { icon: Heading2, name: "Subheading", text: "Add a subheading", fontSize: 32, fontWeight: "600" },
    { icon: TextIcon, name: "Body Text", text: "Add body text", fontSize: 18 },
    { icon: Quote, name: "Quote", text: '"Add a quote"', fontSize: 24, fontWeight: "300" },
  ];

  return (
    <ScrollArea className={"h-full"}>
      <div className={"flex flex-col gap-4 p-3"}>
        {/* Text Presets */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Text</Label>
          <div className={"flex flex-col gap-1"}>
            {textPresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <Button
                  key={preset.name}
                  variant={"ghost"}
                  className={"h-auto justify-start gap-2 py-2"}
                  onClick={() => handleAddText(preset)}
                >
                  <Icon className={"h-4 w-4 shrink-0"} />
                  <div className={"flex flex-col items-start"}>
                    <span className={"text-sm"}>{preset.name}</span>
                    <span
                      className={"text-muted-foreground text-xs"}
                      style={{
                        fontSize: Math.min(preset.fontSize / 4, 12),
                        fontWeight: preset.fontWeight,
                      }}
                    >
                      {preset.text}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Basic Shapes */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Basic Shapes</Label>
          <div className={"grid grid-cols-4 gap-2"}>
            {shapePresets.map((shape) => {
              const Icon = shape.icon;
              return (
                <Button
                  key={shape.name}
                  variant={"outline"}
                  size={"icon"}
                  className={"h-12 w-full"}
                  onClick={shape.action}
                >
                  <Icon className={"h-5 w-5"} />
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Image Upload */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Images</Label>
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2",
              "border-muted-foreground/25 rounded-lg border-2 border-dashed",
              "hover:border-muted-foreground/50 py-8 transition-colors",
              "cursor-pointer",
            )}
            onClick={() => fileInputRef.current?.click()}
            role={"button"}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
          >
            <Upload className={"text-muted-foreground h-8 w-8"} />
            <div className={"text-center"}>
              <p className={"text-sm font-medium"}>Upload Image</p>
              <p className={"text-muted-foreground text-xs"}>PNG, JPG, GIF, SVG</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type={"file"}
            accept={"image/*"}
            className={"hidden"}
            onChange={handleImageUpload}
          />
        </div>

        <Separator />

        {/* Quick Templates */}
        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Quick Add</Label>
          <div className={"grid grid-cols-2 gap-2"}>
            <Button
              variant={"outline"}
              size={"sm"}
              className={"h-auto flex-col gap-1 py-3"}
              onClick={() => addText("Your Brand")}
            >
              <Type className={"h-5 w-5"} />
              <span className={"text-xs"}>Logo Text</span>
            </Button>
            <Button
              variant={"outline"}
              size={"sm"}
              className={"h-auto flex-col gap-1 py-3"}
              onClick={() => addText("Call to Action →")}
            >
              <Type className={"h-5 w-5"} />
              <span className={"text-xs"}>CTA Button</span>
            </Button>
          </div>
        </div>

        {/* Color Palettes */}
        <Separator />

        <div className={"flex flex-col gap-2"}>
          <Label className={"text-xs font-medium"}>Color Palettes</Label>
          <div className={"flex flex-col gap-2"}>
            {[
              ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
              ["#2d3436", "#636e72", "#b2bec3", "#dfe6e9"],
              ["#6c5ce7", "#a29bfe", "#fd79a8", "#e84393"],
              ["#00b894", "#00cec9", "#0984e3", "#6c5ce7"],
              ["#fdcb6e", "#f39c12", "#e74c3c", "#c0392b"],
            ].map((palette, index) => (
              <div key={index} className={"flex gap-1"}>
                {palette.map((color) => (
                  <div
                    key={color}
                    className={cn(
                      "h-6 flex-1 cursor-pointer rounded-sm transition-transform hover:scale-110",
                      "ring-border ring-1",
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                    onClick={() => {
                      navigator.clipboard.writeText(color);
                    }}
                    role={"button"}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigator.clipboard.writeText(color);
                      }
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className={"text-muted-foreground text-xs"}>Click a color to copy to clipboard</p>
        </div>
      </div>
    </ScrollArea>
  );
};
