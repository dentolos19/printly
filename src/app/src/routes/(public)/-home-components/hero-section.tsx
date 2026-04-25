import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "#/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[90dvh] items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image alt="Apparel Studio" className="w-full scale-105 object-cover" priority src="/assets/hero.png" />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/90 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-6 lg:px-12">
        <div className="fade-in slide-in-from-left max-w-2xl animate-in space-y-8 duration-1000">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 font-medium text-primary text-sm ring-1 ring-primary/20 ring-inset">
            <Sparkles className="size-4" />
            <span>New Custom Styles for 2026</span>
          </div>

          <h2 className="font-extrabold text-5xl tracking-tight lg:text-7xl">
            Your Brand, <br />
            <span className="text-primary italic">Perfectly</span> Printed.
          </h2>

          <p className="text-muted-foreground text-xl leading-relaxed md:text-2xl">
            Elevate your team's look with premium custom apparel. High-quality prints, sustainable fabrics, and expert
            craftsmanship.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild className="h-14 rounded-full px-8 text-lg" size="lg">
              <Link to="/auth">
                Start Designing
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
            <Button asChild className="h-14 rounded-full px-8 text-lg backdrop-blur-sm" size="lg" variant="outline">
              <Link to="#products">Explore Catalog</Link>
            </Button>
          </div>

          <div className="flex items-center gap-8 border-border/50 border-t pt-8">
            <div>
              <p className="font-bold text-2xl">5k+</p>
              <p className="font-medium text-muted-foreground text-sm">Happy Brands</p>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div>
              <p className="font-bold text-2xl">48h</p>
              <p className="font-medium text-muted-foreground text-sm">Fast Turnaround</p>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div>
              <p className="font-bold text-2xl">100%</p>
              <p className="font-medium text-muted-foreground text-sm">Quality Guaranteed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
