import { Link } from "@tanstack/react-router";
import { HeaderButtons } from "./header-buttons";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-xl transition-all duration-300 lg:px-12">
      <div className="flex items-center gap-3">
        <h1 className="font-bold font-mono text-2xl tracking-tighter">Printly</h1>
      </div>

      <nav className="hidden items-center gap-8 font-semibold text-sm md:flex">
        <Link className="text-muted-foreground transition-colors hover:text-primary" to="#products">
          Products
        </Link>
        <Link className="text-muted-foreground transition-colors hover:text-primary" to="#bulk">
          Bulk Orders
        </Link>
        <Link className="text-muted-foreground transition-colors hover:text-primary" to="/community">
          Community
        </Link>
        <Link className="text-muted-foreground transition-colors hover:text-primary" to="#contact">
          Contact
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <HeaderButtons />
      </div>
    </header>
  );
}
