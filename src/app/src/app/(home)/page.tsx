import { LoggedIn, LoggedOut } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div>
      <div className={"flex items-center justify-between h-16 border-b px-4"}>
        <h1 className={"font-mono font-bold text-xl"}>Enterprise</h1>
        <div>
          <LoggedIn>
            <Button variant={"default"} asChild>
              <Link href={"/platform"}>Dashboard</Link>
            </Button>
          </LoggedIn>
          <LoggedOut>
            <Button variant={"default"} asChild>
              <Link href={"/auth"}>Login</Link>
            </Button>
          </LoggedOut>
        </div>
      </div>
    </div>
  );
}