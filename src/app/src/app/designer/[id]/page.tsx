"use client";

import { DesignerCanvas } from "@/app/designer/components/canvas";
import { DesignerProvider, useKeyboardShortcuts } from "@/app/designer/components/hooks";
import { IconToolbar } from "@/app/designer/components/icon-toolbar";
import { LeftPanel, RightPanel } from "@/app/designer/components/panels";
import { StatusBar } from "@/app/designer/components/status-bar";
import { ToolbarHeader } from "@/app/designer/components/toolbar-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useServer } from "@/lib/providers/server";
import { cn } from "@/lib/utils";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function DesignerContent({ className }: { className?: string }) {
  useKeyboardShortcuts();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Top toolbar/menu bar */}
      <ToolbarHeader />

      {/* Main content area */}
      <div className={"flex flex-1 overflow-hidden"}>
        {/* Left icon toolbar */}
        <IconToolbar />

        {/* Left expandable panel */}
        <LeftPanel />

        {/* Main canvas area */}
        <DesignerCanvas />

        {/* Right properties panel */}
        <RightPanel />
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { api, fetch: serverFetch } = useServer();

  const designId = params?.id as string | undefined;
  const isNew = designId === "new";

  const [initialDesignId, setInitialDesignId] = useState<string | null>(isNew ? null : designId || null);
  const [initialDesignName, setInitialDesignName] = useState("Untitled Design");
  const [isLoading, setIsLoading] = useState(!isNew && !!designId);

  // Load design data if editing an existing design
  useEffect(() => {
    if (!isNew && designId && designId !== "new") {
      setIsLoading(true);
      api.design
        .getDesign(designId)
        .then((design) => {
          setInitialDesignName(design.name);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Failed to load design:", error);
          setIsLoading(false);
          router.push("/designer/new");
        });
    }
  }, [designId, isNew, api.design, router]);

  // Save handler
  const handleSave = useCallback(
    (data: { name: string; data: string }) => {
      return new Promise<{ id: string }>((resolve, reject) => {
        if (initialDesignId) {
          // Update existing design
          api.design
            .updateDesign(initialDesignId, {
              name: data.name,
              data: data.data,
            })
            .then((design) => {
              resolve({ id: design.id });
            })
            .catch(reject);
        } else {
          // Create new design
          api.design
            .createDesign({
              name: data.name,
              data: data.data,
            })
            .then((design) => {
              setInitialDesignId(design.id);
              // Update URL to include design ID without full reload
              window.history.replaceState(null, "", `/designer/${design.id}`);
              resolve({ id: design.id });
            })
            .catch(reject);
        }
      });
    },
    [initialDesignId, api.design],
  );

  // Load handler (for when design is loaded from backend)
  const handleLoad = useCallback(
    (id: string) => {
      return new Promise<{ name: string; data: string }>((resolve, reject) => {
        api.design
          .getDesign(id)
          .then((design) => {
            resolve({
              name: design.name,
              data: design.data,
            });
          })
          .catch(reject);
      });
    },
    [api.design],
  );

  // Generate image handler for AI Generator
  const handleGenerateImage = useCallback(
    (prompt: string) => {
      return new Promise<string>((resolve, reject) => {
        api.generate
          .generateImage(prompt)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            resolve(url);
          })
          .catch(reject);
      });
    },
    [api.generate],
  );

  if (isLoading) {
    return (
      <div className={"flex h-dvh w-dvw items-center justify-center"}>
        <div className={"flex flex-col items-center gap-2"}>
          <div className={"border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"} />
          <span className={"text-muted-foreground text-sm"}>Loading design...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={"h-dvh w-dvw"}>
      <TooltipProvider delayDuration={300}>
        <DesignerProvider
          initialDesignId={initialDesignId}
          initialDesignName={initialDesignName}
          onSave={handleSave}
          onLoad={handleLoad}
          onGenerateImage={handleGenerateImage}
        >
          <DesignerContent className={"size-full"} />
        </DesignerProvider>
      </TooltipProvider>
    </div>
  );
}
