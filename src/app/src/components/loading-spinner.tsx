import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export default function LoadingSpinner(props: ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center justify-center", props.className)}>
      <div className={"space-y-2"}>
        <Spinner className={"mx-auto size-6"} />
        <p className={"text-muted-foreground text-sm"}>Making your prints more lively...</p>
      </div>
    </div>
  );
}
