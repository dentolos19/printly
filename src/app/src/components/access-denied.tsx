import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { ComponentProps } from "react";

export default function AccessDenied(props: ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center justify-center", props.className)}>
      <Card className={"w-full max-w-md m-2"}>
        <CardHeader className={"text-center"}>
          <div className={"mx-auto flex size-16 items-center justify-center rounded-full bg-red-200"}>
            <ShieldAlertIcon className={"size-8 text-red-600"} />
          </div>
          <CardTitle className={"text-2xl font-bold"}>Access Denied</CardTitle>
          <CardDescription>You don't have permission to access this resource.</CardDescription>
        </CardHeader>
        <CardContent className={"space-y-4"}>
          <p className={"text-center text-sm text-muted-foreground"}>
            This page or resource requires authentication or special permissions. If you believe this is an error,
            please contact support.
          </p>
          <div className={"flex flex-col gap-2 sm:flex-row"}>
            <Button asChild={true} className={"flex-1"}>
              <Link href={"/"}>Home</Link>
            </Button>
            <Button asChild={true} variant={"outline"} className={"flex-1"}>
              <Link href={"/auth"}>Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
