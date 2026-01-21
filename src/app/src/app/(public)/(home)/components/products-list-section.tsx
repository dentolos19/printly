import { Sparkles } from "lucide-react";
import { ProductsSection } from "./products-section";

export function ProductsListSection() {
  return (
    <section id="products" className="bg-background px-6 py-24 lg:px-12">
      <div className="container mx-auto space-y-16">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase">
            <Sparkles className="size-3" />
            <span>Curated Collection</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Favorite Essentials</h2>
          <p className="text-muted-foreground max-w-2xl text-lg">
            From classic tees to premium hoodies, discover the perfect base for your brand's next masterpiece.
          </p>
        </div>

        <ProductsSection />
      </div>
    </section>
  );
}
