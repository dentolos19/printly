import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductResponse } from "@/lib/server/product";
import { ArrowUpRight, Package } from "lucide-react";
import Image from "next/image";

export function ProductCard({ product, onClick }: { product: ProductResponse; onClick: () => void }) {
  const totalStock = product.variants.reduce((sum, v) => sum + (v.inventory?.quantity ?? 0), 0);

  // Get unique sizes and colors for description
  const uniqueSizes = [...new Set(product.variants.map((v) => v.size))];
  const uniqueColors = [...new Set(product.variants.map((v) => v.color))];

  // Get the first variant with an image for display
  const displayImage = product.variants.find((v) => v.imageUrl)?.imageUrl ?? null;

  return (
    <Card
      className="group border-border bg-card hover:border-primary/50 hover:shadow-primary/5 cursor-pointer overflow-hidden transition-all hover:shadow-2xl"
      onClick={onClick}
    >
      <div className="bg-muted relative aspect-square overflow-hidden">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-slate-100">
            <Package className="size-16 text-slate-400" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="scale-50 rounded-full bg-white p-3 text-black transition-transform duration-300 group-hover:scale-100">
            <ArrowUpRight className="size-6" />
          </div>
        </div>
      </div>

      <CardHeader className="space-y-1">
        <CardTitle className="group-hover:text-primary text-xl font-bold transition-colors">{product.name}</CardTitle>
        <CardDescription className="text-sm">
          {uniqueSizes.length} sizes available • {uniqueColors.length} unique colors
        </CardDescription>
      </CardHeader>

      <CardContent className="flex items-center justify-between pt-0 pb-6">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs font-semibold uppercase">Starting from</span>
          <span className="text-foreground text-2xl font-black">${product.basePrice.toFixed(2)}</span>
        </div>

        <div className="text-right">
          {totalStock > 0 ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 ring-1 ring-emerald-500/20 ring-inset">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              In Stock
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 ring-1 ring-red-500/20 ring-inset">
              Out of Stock
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
