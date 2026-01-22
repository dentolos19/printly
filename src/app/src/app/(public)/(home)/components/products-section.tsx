"use client";

import { ProductModal } from "@/components/product-modal";
import { Button } from "@/components/ui/button";
import { useServer } from "@/lib/providers/server";
import { ProductResponse } from "@/lib/server/product";
import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "./product-card";
import { ProductsSkeleton } from "./products-skeleton";

export function ProductsSection() {
  const server = useServer();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Only fetch active products
        const data = await server.api.product.getProducts(true);
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        toast.error("Failed to load products", {
          description: "Please try refreshing the page.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [server]);

  const handleProductClick = (product: ProductResponse) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const displayedProducts = showAll ? products : products.slice(0, 4);

  return (
    <>
      {loading ? (
        <ProductsSkeleton />
      ) : products.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12" />
          <p className="text-lg">No products available at the moment.</p>
          <p className="text-sm">Check back soon!</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
            ))}
          </div>
          {products.length > 4 && !showAll && (
            <div className="mt-8 flex justify-center">
              <Button size="lg" variant="outline" onClick={() => setShowAll(true)}>
                Show All Products ({products.length})
              </Button>
            </div>
          )}
          {showAll && products.length > 4 && (
            <div className="mt-8 flex justify-center">
              <Button size="lg" variant="outline" onClick={() => setShowAll(false)}>
                Show Less
              </Button>
            </div>
          )}
        </>
      )}

      <ProductModal product={selectedProduct} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
