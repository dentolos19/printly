import { Link } from "@tanstack/react-router";
import { SearchXIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";

export default function NotFound(props: ComponentProps<"div">) {
  return (
    <div className={cn("flex size-full items-center justify-center", props.className)}>
      <Card className={"m-2 w-full max-w-md"}>
        <CardHeader className={"text-center"}>
          <div className={"mx-auto flex size-16 items-center justify-center rounded-full bg-orange-200"}>
            <SearchXIcon className={"size-8 text-orange-600"} />
          </div>
          <CardTitle className={"text-2xl font-bold"}>Not Found</CardTitle>
          <CardDescription>The resource you are looking for does not exist.</CardDescription>
        </CardHeader>
        <CardContent className={"space-y-4"}>
          <p className={"text-muted-foreground text-center text-sm"}>
            The page or resource you requested could not be found. It may have been moved, deleted, or the URL might be
            incorrect.
          </p>
          <div className={"flex flex-col gap-2 sm:flex-row"}>
            <Button asChild={true} className={"flex-1"}>
              <Link to={"/"}>Home</Link>
            </Button>
            <Button asChild={true} className={"flex-1"} variant={"outline"}>
              <Link to={"/"}>Browse Products</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
