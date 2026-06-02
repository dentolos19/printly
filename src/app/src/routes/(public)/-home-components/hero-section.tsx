import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight } from "lucide-react";

import { Button } from "#/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[90dvh] items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Apparel Studio"
          className="w-full scale-105 object-cover"
          height={1080}
          layout="fullWidth"
          priority
          src="/assets/hero.png"
        />
        <div className="from-background via-background/90 absolute inset-0 bg-linear-to-r to-transparent" />
        <div className="from-background absolute inset-0 bg-linear-to-t via-transparent to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-6 lg:px-12">
        <div className="fade-in slide-in-from-left animate-in max-w-2xl space-y-8 duration-1000">
          <h2 className="text-5xl font-extrabold tracking-tight lg:text-7xl">
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
              <a href="#products">Explore Catalog</a>
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
