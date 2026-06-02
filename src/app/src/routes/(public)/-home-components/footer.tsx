import { Image } from "@unpic/react";
import { Github, Instagram, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-border bg-muted/50 border-t pt-20 pb-10">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Image alt="Printly Logo" height={32} src={"/icon.png"} width={32} />
              <h2 className="text-2xl font-bold tracking-tighter">Printly</h2>
            </div>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              Empowering brands through high-quality custom apparel.
            </p>
            <div className="flex gap-4">
              {[Twitter, Instagram, Github, Linkedin].map((Icon, i) => (
                <a
                  className="border-border bg-background text-muted-foreground hover:border-primary hover:text-primary rounded-full border p-2 shadow-sm transition-all"
                  href="#"
                  key={i}
                >
                  <Icon className="size-5" />
                </a>
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
              <h3 className="text-foreground text-xs font-bold tracking-widest uppercase">{group.title}</h3>
              <ul className="space-y-4">
                {group.links.map((link, i) => (
                  <li key={i}>
                    <a className="text-muted-foreground hover:text-primary text-sm transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border text-muted-foreground flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm md:flex-row">
          <p>&copy; 2025 Dennise Catolos</p>
          <div className="flex gap-8">
            <a className="hover:text-primary transition-colors" href="https://dennise.me/privacy">
              Privacy Policy
            </a>
            <a className="hover:text-primary transition-colors" href="https://dennise.me/terms">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
