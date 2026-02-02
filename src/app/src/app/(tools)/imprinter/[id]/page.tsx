"use client";

import { ImprinterContent } from "@/app/(tools)/imprinter/components";
import { ImprinterProvider } from "@/app/(tools)/imprinter/components/hooks/use-imprinter";
import type { AppliedDesign, CameraState, ProductModel } from "@/app/(tools)/imprinter/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useServer } from "@/lib/providers/server";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { api } = useServer();

  const imprintId = params?.id as string | undefined;
  const isNew = imprintId === "new";

  // Get product/variant/design from URL params
  const initialProductId = searchParams.get("product");
  const initialVariantId = searchParams.get("variant");
  const initialDesignId = searchParams.get("design");

  const [initialImprintId, setInitialImprintId] = useState<string | null>(isNew ? null : imprintId || null);
  const [initialImprintName, setInitialImprintName] = useState("Untitled Imprint");
  const [isLoading, setIsLoading] = useState(true);
  const [needsProductSelection, setNeedsProductSelection] = useState(false);

  // Load imprint data if editing an existing one
  useEffect(() => {
    if (!isNew && imprintId && imprintId !== "new") {
      api.imprint
        .getImprint(imprintId)
        .then((imprint) => {
          setInitialImprintName(imprint.name);
        })
        .catch((error) => {
          console.error("Failed to load imprint:", error);
          router.push("/imprinter/new");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Check if we have a design but no product - need to show product selection
      if (initialDesignId && !initialProductId) {
        setNeedsProductSelection(true);
      }
      setIsLoading(false);
    }
  }, [imprintId, isNew, initialDesignId, initialProductId, api.imprint, router]);

  // Handler to load products with 3D models
  const handleLoadProducts = useCallback(async () => {
    const products = await api.product.getProducts();
    return products;
  }, [api.product]);

  // Upload preview handler
  const handleUploadPreview = useCallback(
    async (blob: Blob): Promise<string> => {
      const file = new File([blob], `imprint-preview-${Date.now()}.png`, { type: "image/png" });
      const asset = await api.asset.uploadAsset(file, "Imprint preview", "cover");
      return asset.id;
    },
    [api.asset],
  );

  // Save handler
  const handleSave = useCallback(
    (
      data: { name: string; data: string; currentId: string | null; previewId?: string | null } & Partial<{
        version: string;
        productModel: ProductModel;
        productColor: string;
        appliedDesigns: AppliedDesign[];
        cameraState: CameraState;
      }>,
    ) => {
      return new Promise<{ id: string }>((resolve, reject) => {
        const targetId = data.currentId || initialImprintId;

        if (targetId) {
          // Update existing imprint
          api.imprint
            .updateImprint(targetId, {
              name: data.name,
              data: data.data,
              previewId: data.previewId || undefined,
            })
            .then((imprint) => {
              resolve({ id: imprint.id });
            })
            .catch(reject);
        } else {
          // Create new imprint
          api.imprint
            .createImprint({
              name: data.name,
              data: data.data,
              description: "Imprint configuration",
              previewId: data.previewId || undefined,
            })
            .then((imprint) => {
              window.history.replaceState(null, "", `/imprinter/${imprint.id}`);
              resolve({ id: imprint.id });
            })
            .catch(reject);
        }
      });
    },
    [initialImprintId, api.imprint],
  );

  // Load handler
  const handleLoad = useCallback(
    (id: string) => {
      return new Promise<{ name: string; data: string }>((resolve, reject) => {
        api.imprint
          .getImprint(id)
          .then((imprint) => {
            resolve({
              name: imprint.name,
              data: imprint.data,
            });
          })
          .catch(reject);
      });
    },
    [api.imprint],
  );

  // Load design handler for restoring full design data
  const handleLoadDesign = useCallback(
    (designId: string) => {
      return api.design.getDesign(designId);
    },
    [api.design],
  );

  // Load print areas handler
  const handleLoadPrintAreas = useCallback(
    (productId: string) => {
      return api.printArea.getByProduct(productId);
    },
    [api.printArea],
  );

  if (isLoading) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          <span className="text-muted-foreground text-sm">Loading imprint...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-dvw">
      <TooltipProvider delayDuration={300}>
        <ImprinterProvider
          initialImprintId={initialImprintId}
          initialImprintName={initialImprintName}
          initialProductId={initialProductId}
          initialVariantId={initialVariantId}
          initialDesignId={initialDesignId}
          needsProductSelection={needsProductSelection}
          onProductSelected={() => setNeedsProductSelection(false)}
          onSave={handleSave}
          onLoad={handleLoad}
          onLoadDesign={handleLoadDesign}
          onLoadProducts={handleLoadProducts}
          onLoadPrintAreas={handleLoadPrintAreas}
          onUploadPreview={handleUploadPreview}
        >
          <ImprinterContent />
        </ImprinterProvider>
      </TooltipProvider>
    </div>
  );
}
