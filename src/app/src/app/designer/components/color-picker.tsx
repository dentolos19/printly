"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Pipette } from "lucide-react";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

type ColorPickerProps = {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
};

const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#78716c",
];

export function ColorPicker({ color, onChange, label, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handlePresetClick(presetColor: string) {
    onChange(presetColor);
  }

  function handleEyeDropper() {
    if ("EyeDropper" in window) {
      const eyeDropper = new (
        window as typeof window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }
      ).EyeDropper();
      eyeDropper.open().then((result) => {
        onChange(result.sRGBHex);
      });
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label className={"text-muted-foreground text-xs"}>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type={"button"}
            variant={"outline"}
            className={cn("h-8 w-full justify-start gap-2 px-2", !color && "text-muted-foreground")}
          >
            <div
              className={"border-border h-4 w-4 rounded border"}
              style={{ backgroundColor: color || "transparent" }}
            />
            <span className={"flex-1 truncate text-left text-xs"}>{color || "No color"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={"w-64 p-3"} align={"start"}>
          <div className={"flex flex-col gap-3"}>
            <HexColorPicker color={color} onChange={onChange} className={"w-full!"} />

            <div className={"flex items-center gap-2"}>
              <div className={"flex-1"}>
                <HexColorInput
                  color={color}
                  onChange={onChange}
                  prefixed
                  className={cn(
                    "border-input bg-background h-8 w-full rounded-md border px-2 text-xs",
                    "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
                  )}
                />
              </div>
              {"EyeDropper" in window && (
                <Button
                  type={"button"}
                  variant={"outline"}
                  size={"icon"}
                  className={"h-8 w-8"}
                  onClick={handleEyeDropper}
                >
                  <Pipette className={"h-3.5 w-3.5"} />
                </Button>
              )}
            </div>

            <div className={"flex flex-col gap-1.5"}>
              <Label className={"text-muted-foreground text-xs"}>Presets</Label>
              <div className={"grid grid-cols-10 gap-1"}>
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type={"button"}
                    className={cn(
                      "border-border h-5 w-5 rounded-sm border transition-transform hover:scale-110",
                      color === presetColor && "ring-ring ring-2 ring-offset-1",
                    )}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handlePresetClick(presetColor)}
                  />
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
