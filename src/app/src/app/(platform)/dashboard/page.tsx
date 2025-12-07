"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className={"p-6 w-full"}>
      <div className={"flex justify-between mb-8"}>
        <div>
          <h1 className={"font-bold mb-2 text-4xl"}>Welcome to Printly</h1>
          <p className={"text-muted-foreground"}>This is your dashboard where you can manage your projects.</p>
        </div>
        <Button size={"lg"} asChild>
          <Link href={"/designer"}>
            <PlusIcon />
            <span>New Design</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
