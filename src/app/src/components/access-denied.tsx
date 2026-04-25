import { Link } from "@tanstack/react-router";
import { ShieldAlertIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";

export default function AccessDenied(props: ComponentProps<"div">) {
  return (
    <div className={cn("flex size-full items-center justify-center", props.className)}>
      <Card className={"m-2 w-full max-w-md"}>
        <CardHeader className={"text-center"}>
          <div className={"mx-auto flex size-16 items-center justify-center rounded-full bg-red-200"}>
            <ShieldAlertIcon className={"size-8 text-red-600"} />
          </div>
          <CardTitle className={"font-bold text-2xl"}>Access Denied</CardTitle>
          <CardDescription>You don't have permission to access this resource.</CardDescription>
        </CardHeader>
        <CardContent className={"space-y-4"}>
          <p className={"text-center text-muted-foreground text-sm"}>
            This page or resource requires authentication or special permissions. If you believe this is an error,
            please contact support.
          </p>
          <div className={"flex flex-col gap-2 sm:flex-row"}>
            <Button asChild={true} className={"flex-1"}>
              <Link to={"/"}>Home</Link>
            </Button>
            <Button asChild={true} className={"flex-1"} variant={"outline"}>
              <Link to={"/auth"}>Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
