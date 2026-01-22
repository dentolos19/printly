"use client";

import { ImprinterContent } from "@/app/(tools)/imprinter/components";
import { ImprinterProvider } from "@/app/(tools)/imprinter/components/hooks/use-imprinter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useServer } from "@/lib/providers/server";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const { api } = useServer();

  const imprintId = params?.id as string | undefined;
  const isNew = imprintId === "new";

  const [initialImprintId, setInitialImprintId] = useState<string | null>(isNew ? null : imprintId || null);
  const [initialImprintName, setInitialImprintName] = useState("Untitled Imprint");
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
    }
  }, [imprintId, isNew, api.imprint, router]);

  // Save handler
  const handleSave = useCallback(
    (data: { name: string; data: string }) => {
      return new Promise<{ id: string }>((resolve, reject) => {
        if (initialImprintId) {
          // Update existing imprint
          api.imprint
            .updateImprint(initialImprintId, {
              name: data.name,
              data: data.data,
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
            })
            .then((imprint) => {
              setInitialImprintId(imprint.id);
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
          onSave={handleSave}
          onLoad={handleLoad}
        >
          <ImprinterContent />
        </ImprinterProvider>
      </TooltipProvider>
    </div>
  );
}
