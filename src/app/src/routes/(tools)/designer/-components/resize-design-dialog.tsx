"use client";

import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { cn } from "#/lib/utils";
import type { CanvasSize } from "#/routes/(tools)/designer/-types";
import { CANVAS_PRESETS } from "#/routes/(tools)/designer/-types";

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
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className={"max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Resize Design</DialogTitle>
          <DialogDescription>
            Change the canvas dimensions. Current size: {currentSize.width} × {currentSize.height}px
          </DialogDescription>
        </DialogHeader>

        <Tabs className={"mt-4"} defaultValue={"presets"}>
          <TabsList className={"grid w-full grid-cols-2"}>
            <TabsTrigger value={"presets"}>Presets</TabsTrigger>
            <TabsTrigger value={"custom"}>Custom Size</TabsTrigger>
          </TabsList>

          <TabsContent className={"mt-4"} value={"presets"}>
            <ScrollArea className={"h-64 pr-4"}>
              <div className={"space-y-4"}>
                <div>
                  <h4 className={"mb-2 font-medium text-muted-foreground text-sm"}>Social Media</h4>
                  <div className={"grid grid-cols-2 gap-2"}>
                    {socialPresets.map((preset) => (
                      <Button
                        className={cn(
                          "h-auto justify-start py-2",
                          selectedPreset === preset.name && "border-primary bg-primary/5",
                        )}
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset)}
                        type={"button"}
                        variant={"outline"}
                      >
                        <div className={"text-left"}>
                          <div className={"font-medium text-sm"}>{preset.name}</div>
                          <div className={"text-muted-foreground text-xs"}>
                            {preset.width} × {preset.height}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className={"mb-2 font-medium text-muted-foreground text-sm"}>Print</h4>
                  <div className={"grid grid-cols-2 gap-2"}>
                    {printPresets.map((preset) => (
                      <Button
                        className={cn(
                          "h-auto justify-start py-2",
                          selectedPreset === preset.name && "border-primary bg-primary/5",
                        )}
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset)}
                        type={"button"}
                        variant={"outline"}
                      >
                        <div className={"text-left"}>
                          <div className={"font-medium text-sm"}>{preset.name}</div>
                          <div className={"text-muted-foreground text-xs"}>
                            {preset.width} × {preset.height}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className={"mb-2 font-medium text-muted-foreground text-sm"}>Presentation</h4>
                  <div className={"grid grid-cols-2 gap-2"}>
                    {presentationPresets.map((preset) => (
                      <Button
                        className={cn(
                          "h-auto justify-start py-2",
                          selectedPreset === preset.name && "border-primary bg-primary/5",
                        )}
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset)}
                        type={"button"}
                        variant={"outline"}
                      >
                        <div className={"text-left"}>
                          <div className={"font-medium text-sm"}>{preset.name}</div>
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

          <TabsContent className={"mt-4"} value={"custom"}>
            <div className={"grid grid-cols-2 gap-4"}>
              <div className={"space-y-2"}>
                <Label htmlFor={"width"}>Width (px)</Label>
                <Input
                  id={"width"}
                  max={10000}
                  min={100}
                  onChange={(e) => {
                    setWidth(Number(e.target.value));
                    handleCustomChange();
                  }}
                  type={"number"}
                  value={width}
                />
              </div>
              <div className={"space-y-2"}>
                <Label htmlFor={"height"}>Height (px)</Label>
                <Input
                  id={"height"}
                  max={10000}
                  min={100}
                  onChange={(e) => {
                    setHeight(Number(e.target.value));
                    handleCustomChange();
                  }}
                  type={"number"}
                  value={height}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className={"mt-4 flex items-center space-x-2"}>
          <Checkbox
            checked={scaleContent}
            id={"scale-content"}
            onCheckedChange={(checked) => setScaleContent(checked === true)}
          />
          <Label className={"font-normal text-sm"} htmlFor={"scale-content"}>
            Scale content proportionally
          </Label>
        </div>

        <DialogFooter className={"mt-6"}>
          <Button onClick={() => onOpenChange(false)} type={"button"} variant={"outline"}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} type={"button"}>
            Resize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
