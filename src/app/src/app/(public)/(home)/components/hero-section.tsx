import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[90dvh] items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image src="/hero_apparel_vibe.png" alt="Apparel Studio" fill className="scale-105 object-cover" priority />
        <div className="from-background via-background/90 absolute inset-0 bg-linear-to-r to-transparent" />
        <div className="from-background absolute inset-0 bg-linear-to-t via-transparent to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-6 lg:px-12">
        <div className="animate-in fade-in slide-in-from-left max-w-2xl space-y-8 duration-1000">
          <div className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset">
            <Sparkles className="size-4" />
            <span>New Custom Styles for 2026</span>
          </div>

          <h2 className="text-5xl font-extrabold tracking-tight lg:text-7xl">
            Your Brand, <br />
            <span className="text-primary italic">Perfectly</span> Printed.
          </h2>

          <p className="text-muted-foreground text-xl leading-relaxed md:text-2xl">
            Elevate your team's look with premium custom apparel. High-quality prints, sustainable fabrics, and expert
            craftsmanship.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="h-14 rounded-full px-8 text-lg" asChild>
              <Link href="/dashboard/new">
                Start Designing
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 rounded-full px-8 text-lg backdrop-blur-sm" asChild>
              <Link href="#products">Explore Catalog</Link>
            </Button>
          </div>

          <div className="border-border/50 flex items-center gap-8 border-t pt-8">
            <div>
              <p className="text-2xl font-bold">5k+</p>
              <p className="text-muted-foreground text-sm font-medium">Happy Brands</p>
            </div>
            <div className="bg-border/50 h-8 w-px" />
            <div>
              <p className="text-2xl font-bold">48h</p>
              <p className="text-muted-foreground text-sm font-medium">Fast Turnaround</p>
            </div>
            <div className="bg-border/50 h-8 w-px" />
            <div>
              <p className="text-2xl font-bold">100%</p>
              <p className="text-muted-foreground text-sm font-medium">Quality Guaranteed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
