import { Link } from "@tanstack/react-router";
import { AlertTriangleIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";

export default function ErrorOccurred({ error, ...props }: ComponentProps<"div"> & { error: Error }) {
  return (
    <div className={cn("flex size-full items-center justify-center", props.className)}>
      <Card className={"m-2 w-full max-w-md"}>
        <CardHeader className={"text-center"}>
          <div className={"mx-auto flex size-16 items-center justify-center rounded-full bg-red-200"}>
            <AlertTriangleIcon className={"size-8 text-red-600"} />
          </div>
          <CardTitle className={"text-2xl font-bold"}>Critical Error</CardTitle>
          <CardDescription>An unexpected error occurred.</CardDescription>
        </CardHeader>
        <CardContent className={"space-y-4"}>
          <p className={"text-muted-foreground text-center text-sm"}>
            Something went wrong while processing your request. Please try again or contact support if the issue
            persists.
          </p>
          <div className={"bg-muted rounded-md p-3"}>
            <p className={"font-mono text-sm leading-relaxed"}>{error.message}</p>
          </div>
          <div className={"flex flex-col gap-2 sm:flex-row"}>
            <Button asChild={true} className={"flex-1"}>
              <Link to={"/"}>Home</Link>
            </Button>
            <Button className={"flex-1"} onClick={() => window.location.reload()} variant={"outline"}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
