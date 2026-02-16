"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { useImprinter } from "../hooks/use-imprinter";

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Courier New, monospace", label: "Courier New" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "Comic Sans MS, cursive", label: "Comic Sans" },
  { value: "Times New Roman, serif", label: "Times New Roman" },
  { value: "Verdana, sans-serif", label: "Verdana" },
];

export function TextPanel() {
  const { addTextToProduct, activePrintArea, setActiveTool } = useImprinter();
  const [text, setText] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#000000");

  const handleApply = useCallback(() => {
    if (!text.trim()) return;
    addTextToProduct(text, fontFamily, fontSize, color, activePrintArea);
    setText("");
  }, [text, fontFamily, fontSize, color, activePrintArea, addTextToProduct]);

  return (
    <div className="bg-popover absolute top-14 left-14 z-50 w-72 rounded-lg border p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Add Text</h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => setActiveTool("select")}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="text-input" className="text-xs">
            Text
          </Label>
          <Input
            id="text-input"
            placeholder="Enter text..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply();
            }}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Font</Label>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Size</Label>
            <span className="text-muted-foreground text-xs">{fontSize}px</span>
          </div>
          <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={12} max={128} step={1} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-8 cursor-pointer rounded border"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-8 flex-1 font-mono text-xs" />
          </div>
        </div>

        <Button onClick={handleApply} disabled={!text.trim()} className="w-full">
          Apply Text
        </Button>
      </div>
    </div>
  );
}
