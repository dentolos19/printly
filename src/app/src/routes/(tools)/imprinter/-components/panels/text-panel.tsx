import { X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Slider } from "#/components/ui/slider";

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
        <Button className="size-7" onClick={() => setActiveTool("select")} size="icon" variant="ghost">
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="text-input">
            Text
          </Label>
          <Input
            autoFocus
            id="text-input"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply();
            }}
            placeholder="Enter text..."
            value={text}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Font</Label>
          <Select onValueChange={setFontFamily} value={fontFamily}>
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
          <Slider max={128} min={12} onValueChange={([v]) => setFontSize(v)} step={1} value={[fontSize]} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex items-center gap-2">
            <input
              className="size-8 cursor-pointer rounded border"
              onChange={(e) => setColor(e.target.value)}
              type="color"
              value={color}
            />
            <Input className="h-8 flex-1 font-mono text-xs" onChange={(e) => setColor(e.target.value)} value={color} />
          </div>
        </div>

        <Button className="w-full" disabled={!text.trim()} onClick={handleApply}>
          Apply Text
        </Button>
      </div>
    </div>
  );
}
