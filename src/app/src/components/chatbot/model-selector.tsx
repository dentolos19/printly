"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIModel } from "@/lib/server/chatbot";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  models: AIModel[];
  isLoading?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, models, isLoading = false }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between text-xs"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span className="truncate">{currentModel?.displayName || "Select model"}</span>
          </div>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <div className="border-b p-3">
          <h4 className="text-sm font-semibold">Choose AI Model</h4>
          <p className="text-muted-foreground mt-1 text-xs">
            Select which AI model to use for your chat. Changing models mid-conversation may affect context.
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "hover:bg-accent flex w-full flex-col items-start gap-1 rounded-md p-3 text-left transition-colors",
                selectedModel === model.id && "bg-accent",
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{model.displayName}</span>
                    {model.isDefault && (
                      <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">Default</span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">{model.description}</p>
                </div>
                {selectedModel === model.id && <Check className="text-primary h-4 w-4 shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
