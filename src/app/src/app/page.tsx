import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Hello, world! From Enterprise App.</h1>
      <Button asChild>
        <Link href={"/auth"}>Login</Link>
      </Button>
    </div>
  );
}