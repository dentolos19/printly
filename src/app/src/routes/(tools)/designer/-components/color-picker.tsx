import { Pipette } from "lucide-react";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";

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
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn("h-8 w-full justify-start gap-2 px-2", !color && "text-muted-foreground")}
            type={"button"}
            variant={"outline"}
          >
            <div
              className={"border-border h-4 w-4 rounded border"}
              style={{ backgroundColor: color || "transparent" }}
            />
            <span className={"flex-1 truncate text-left text-xs"}>{color || "No color"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align={"start"} className={"w-64 p-3"}>
          <div className={"flex flex-col gap-3"}>
            <HexColorPicker className={"w-full!"} color={color} onChange={onChange} />

            <div className={"flex items-center gap-2"}>
              <div className={"flex-1"}>
                <HexColorInput
                  className={cn(
                    "h-8 w-full rounded-md border border-input bg-background px-2 text-xs",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  )}
                  color={color}
                  onChange={onChange}
                  prefixed
                />
              </div>
              {"EyeDropper" in window && (
                <Button
                  className={"h-8 w-8"}
                  onClick={handleEyeDropper}
                  size={"icon"}
                  type={"button"}
                  variant={"outline"}
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
                    className={cn(
                      "h-5 w-5 rounded-sm border border-border transition-transform hover:scale-110",
                      color === presetColor && "ring-2 ring-ring ring-offset-1",
                    )}
                    key={presetColor}
                    onClick={() => handlePresetClick(presetColor)}
                    style={{ backgroundColor: presetColor }}
                    type={"button"}
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
