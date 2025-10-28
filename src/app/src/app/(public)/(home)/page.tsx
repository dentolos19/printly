import { Button } from "@/components/ui/button";
import { LoggedIn, LoggedOut } from "@/lib/providers/auth";
import Link from "next/link";

export default function Page() {
  return (
    <div>
      <div className={"flex items-center justify-between h-16 border-b px-4"}>
        <h1 className={"font-mono font-bold text-xl"}>Makemix</h1>
        <div>
          <LoggedIn>
            <Button variant={"default"} asChild>
              <Link href={"/dashboard"}>Dashboard</Link>
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