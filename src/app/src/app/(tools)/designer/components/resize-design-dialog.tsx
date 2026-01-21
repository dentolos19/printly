"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { CanvasSize } from "../types";
import { CANVAS_PRESETS } from "../types";

type ResizeDesignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSize: CanvasSize;
  onResize: (size: CanvasSize, scaleContent: boolean) => void;
};

export function ResizeDesignDialog({ open, onOpenChange, currentSize, onResize }: ResizeDesignDialogProps) {
  const [width, setWidth] = useState(currentSize.width);
  const [height, setHeight] = useState(currentSize.height);
  const [scaleContent, setScaleContent] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  function handlePresetSelect(preset: (typeof CANVAS_PRESETS)[number]) {
    setWidth(preset.width);
    setHeight(preset.height);
    setSelectedPreset(preset.name);
  }

  function handleCustomChange() {
    setSelectedPreset(null);
  }

  function handleSubmit() {
    onResize({ width, height }, scaleContent);
    onOpenChange(false);
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setWidth(currentSize.width);
      setHeight(currentSize.height);
      setScaleContent(true);
      setSelectedPreset(null);
    }
    onOpenChange(newOpen);
  }

  const socialPresets = CANVAS_PRESETS.filter((p) => p.category === "social");
  const printPresets = CANVAS_PRESETS.filter((p) => p.category === "print");
  const presentationPresets = CANVAS_PRESETS.filter((p) => p.category === "presentation");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={"max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Resize Design</DialogTitle>
          <DialogDescription>
            Change the canvas dimensions. Current size: {currentSize.width} × {currentSize.height}px
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={"presets"} className={"mt-4"}>
          <TabsList className={"grid w-full grid-cols-2"}>
            <TabsTrigger value={"presets"}>Presets</TabsTrigger>
            <TabsTrigger value={"custom"}>Custom Size</TabsTrigger>
          </TabsList>

          <TabsContent value={"presets"} className={"mt-4"}>
            <ScrollArea className={"h-64 pr-4"}>
              <div className={"space-y-4"}>
                <div>
                  <h4 className={"text-muted-foreground mb-2 text-sm font-medium"}>Social Media</h4>
                  <div className={"grid grid-cols-2 gap-2"}>
                    {socialPresets.map((preset) => (
                      <Button
                        key={preset.name}
                        type={"button"}
                        variant={"outline"}
                        className={cn(
                          "h-auto justify-start py-2",
                          selectedPreset === preset.name && "border-primary bg-primary/5",
                        )}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className={"text-left"}>
                          <div className={"text-sm font-medium"}>{preset.name}</div>
                          <div className={"text-muted-foreground text-xs"}>
                            {preset.width} × {preset.height}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className={"text-muted-foreground mb-2 text-sm font-medium"}>Print</h4>
                  <div className={"grid grid-cols-2 gap-2"}>
                    {printPresets.map((preset) => (
                      <Button
                        key={preset.name}
                        type={"button"}
                        variant={"outline"}
                        className={cn(
                          "h-auto justify-start py-2",
                          selectedPreset === preset.name && "border-primary bg-primary/5",
                        )}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className={"text-left"}>
                          <div className={"text-sm font-medium"}>{preset.name}</div>
                          <div className={"text-muted-foreground text-xs"}>
                            {preset.width} × {preset.height}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className={"text-muted-foreground mb-2 text-sm font-medium"}>Presentation</h4>
                  <div className={"grid grid-cols-2 gap-2"}>
                    {presentationPresets.map((preset) => (
                      <Button
                        key={preset.name}
                        type={"button"}
                        variant={"outline"}
                        className={cn(
                          "h-auto justify-start py-2",
                          selectedPreset === preset.name && "border-primary bg-primary/5",
                        )}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className={"text-left"}>
                          <div className={"text-sm font-medium"}>{preset.name}</div>
                          <div className={"text-muted-foreground text-xs"}>
                            {preset.width} × {preset.height}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value={"custom"} className={"mt-4"}>
            <div className={"grid grid-cols-2 gap-4"}>
              <div className={"space-y-2"}>
                <Label htmlFor={"width"}>Width (px)</Label>
                <Input
                  id={"width"}
                  type={"number"}
                  min={100}
                  max={10000}
                  value={width}
                  onChange={(e) => {
                    setWidth(Number(e.target.value));
                    handleCustomChange();
                  }}
                />
              </div>
              <div className={"space-y-2"}>
                <Label htmlFor={"height"}>Height (px)</Label>
                <Input
                  id={"height"}
                  type={"number"}
                  min={100}
                  max={10000}
                  value={height}
                  onChange={(e) => {
                    setHeight(Number(e.target.value));
                    handleCustomChange();
                  }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className={"mt-4 flex items-center space-x-2"}>
          <Checkbox
            id={"scale-content"}
            checked={scaleContent}
            onCheckedChange={(checked) => setScaleContent(checked === true)}
          />
          <Label htmlFor={"scale-content"} className={"text-sm font-normal"}>
            Scale content proportionally
          </Label>
        </div>

        <DialogFooter className={"mt-6"}>
          <Button type={"button"} variant={"outline"} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type={"button"} onClick={handleSubmit}>
            Resize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
