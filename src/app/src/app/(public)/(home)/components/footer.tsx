import { Github, Instagram, Linkedin, Twitter } from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";

export function Footer() {
  return (
    <footer className="border-border border-t bg-slate-50 pt-20 pb-10">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Image alt="Printly Logo" height={32} src={"/icon.png"} width={32} />
              <h2 className="text-2xl font-bold tracking-tighter">Printly</h2>
            </div>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              Empowering brands through high-quality custom apparel. Proudly serving creative teams since 2025.
            </p>
            <div className="flex gap-4">
              {[Twitter, Instagram, Github, Linkedin].map((Icon, i) => (
                <NextLink
                  className="border-border hover:text-primary hover:border-primary rounded-full border bg-white p-2 text-slate-600 shadow-sm transition-all"
                  href="#"
                  key={i}
                >
                  <Icon className="size-5" />
                </NextLink>
              ))}
            </div>
          </div>

          {[
            {
              title: "Product",
              links: ["Catalog", "Bulk Orders", "Design Studio", "Pricing"],
            },
            {
              title: "Community",
              links: ["Gallery", "Affiliates", "Events", "Blog"],
            },
            {
              title: "Company",
              links: ["About Us", "Contact", "Careers", "Legal"],
            },
          ].map((group, idx) => (
            <div className="space-y-6 md:pl-10 lg:pl-0" key={idx}>
              <h3 className="text-xs font-bold tracking-widest text-slate-900 uppercase">{group.title}</h3>
              <ul className="space-y-4">
                {group.links.map((link, i) => (
                  <li key={i}>
                    <NextLink className="text-muted-foreground hover:text-primary text-sm transition-colors" href="#">
                      {link}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 md:flex-row">
          <p>&copy; 2026 Printly. All rights reserved. Crafted with ❤️ for creators.</p>
          <div className="flex gap-8">
            <NextLink className="hover:text-primary transition-colors" href="#">
              Privacy Policy
            </NextLink>
            <NextLink className="hover:text-primary transition-colors" href="#">
              Terms of Service
            </NextLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
