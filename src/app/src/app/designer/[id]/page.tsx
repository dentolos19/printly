"use client";

import Designer from "@/components/designer";
import { useServer } from "@/lib/providers/server";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
      <Designer
        className={"size-full"}
        designId={initialDesignId}
        designName={initialDesignName}
        onSave={handleSave}
        onLoad={handleLoad}
        onGenerateImage={handleGenerateImage}
      />
    </div>
  );
}
