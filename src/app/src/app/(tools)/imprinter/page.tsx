"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/imprinter/new");
  }, [router]);

  return (
    <div className="flex h-dvh w-dvw items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <span className="text-muted-foreground text-sm">Loading imprinter...</span>
      </div>
    </div>
  );
}
