import Link from "next/link";
import { HeaderButtons } from "./header-buttons";

export function Header() {
  return (
    <header className="bg-background/80 fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between border-b px-6 backdrop-blur-xl transition-all duration-300 lg:px-12">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-tighter">Printly</h1>
      </div>

      <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
        <Link href="#products" className="text-muted-foreground hover:text-primary transition-colors">
          Products
        </Link>
        <Link href="#bulk" className="text-muted-foreground hover:text-primary transition-colors">
          Bulk Orders
        </Link>
        <Link href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
          Contact
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <HeaderButtons />
      </div>
    </header>
  );
}
