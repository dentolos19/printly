"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className={"w-full p-6"}>
      <div className={"mb-8 flex justify-between"}>
        <div>
          <h1 className={"mb-2 text-4xl font-bold"}>Welcome to Printly</h1>
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
