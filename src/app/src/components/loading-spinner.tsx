import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export default function LoadingSpinner({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-1 items-center justify-center py-12", className)} {...props}>
      <div className={"flex flex-col items-center gap-2"}>
        <Spinner className={"text-primary size-8"} />
        <p className={"text-muted-foreground animate-pulse text-sm"}>Making your prints more lively...</p>
      </div>
    </div>
  );
}
