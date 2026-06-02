import { Link } from "@tanstack/react-router";

import { HeaderButtons } from "./header-buttons";

export function Header() {
  return (
    <header className="bg-background/80 fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between border-b px-6 backdrop-blur-xl transition-all duration-300 lg:px-12">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-tighter">Printly</h1>
      </div>

      <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
        <a className="text-muted-foreground hover:text-primary transition-colors" href="#products">
          Products
        </a>
        <a className="text-muted-foreground hover:text-primary transition-colors" href="#bulk">
          Bulk Orders
        </a>
        <Link className="text-muted-foreground hover:text-primary transition-colors" to="/community">
          Community
        </Link>
        <a className="text-muted-foreground hover:text-primary transition-colors" href="#contact">
          Contact
        </a>
      </nav>

      <div className="flex items-center gap-4">
        <HeaderButtons />
      </div>
    </header>
  );
}
