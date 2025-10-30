"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusIcon, ShirtIcon } from "lucide-react";

export default function Page() {
  return (
    <div className={"p-6 w-full"}>
      {/* Header */}
      <div className={"flex justify-between mb-8"}>
        <div>
          <h1 className={"font-bold mb-2 text-4xl"}>Welcome to Makemix</h1>
          <p className={"text-muted-foreground"}>This is your dashboard where you can manage your projects.</p>
        </div>
        <Button size={"lg"}>
          <PlusIcon />
          <span>New Design</span>
        </Button>
      </div>

      {/* Templates */}
      <div className={"flex gap-4 [&>*]:flex-1"}>
        <Card>
          <CardContent className={"flex flex-col items-center justify-center py-6"}>
            <ShirtIcon className={"size-12"} />
            <h2 className={"font-bold text-2xl mt-4"}>Make a Shirt</h2>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={"flex flex-col items-center justify-center py-6"}>
            <ShirtIcon className={"size-12"} />
            <h2 className={"font-bold text-2xl mt-4"}>Design a Mug</h2>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={"flex flex-col items-center justify-center py-6"}>
            <ShirtIcon className={"size-12"} />
            <h2 className={"font-bold text-2xl mt-4"}>Make Something Awesome</h2>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}