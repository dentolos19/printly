"use client";

import { CartButton } from "@/components/cart-button";
import { ProductModal } from "@/components/product-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoggedIn, LoggedOut, useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import { ProductResponse } from "@/lib/server/product";
import { Check, Package, Palette, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function ProductsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <Skeleton className="aspect-square rounded-t-xl" />
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductCard({ product, onClick }: { product: ProductResponse; onClick: () => void }) {
  const totalStock = product.variants.reduce((sum, v) => sum + (v.inventory?.quantity ?? 0), 0);

  // Get unique sizes and colors for description
  const uniqueSizes = [...new Set(product.variants.map((v) => v.size))];
  const uniqueColors = [...new Set(product.variants.map((v) => v.color))];

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-lg" onClick={onClick}>
      <div className="bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded-t-xl">
        <Package className="h-16 w-16" />
      </div>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>
          {uniqueSizes.length} sizes • {uniqueColors.length} colors
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-lg font-bold">${product.basePrice.toFixed(2)}</span>
        {totalStock > 0 ? (
          <span className="text-muted-foreground text-sm">{totalStock} in stock</span>
        ) : (
          <span className="text-sm text-red-500">Out of stock</span>
        )}
      </CardContent>
    </Card>
  );
}

function ProductsSection() {
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

function HeaderButtons() {
  const { claims } = useAuth();
  const isAdmin = claims?.role === "admin";

  return (
    <div className="flex items-center gap-2">
      <CartButton />
      <LoggedIn>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href="/admin">Admin</Link>
          </Button>
        )}
        <Button variant="default" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </LoggedIn>
      <LoggedOut>
        <Button variant="default" asChild>
          <Link href="/auth">Login</Link>
        </Button>
      </LoggedOut>
    </div>
  );
}

export default function Page() {
  return (
    <div>
      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b px-4 backdrop-blur lg:px-8">
        <div className="flex items-center gap-2">
          <Image src={"/icon.png"} alt="Printly Logo" width={24} height={24} className="size-6" />
          <h1 className="font-mono text-xl font-bold">Printly</h1>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="#products" className="hover:underline">
            Products
          </Link>
          <Link href="#bulk" className="hover:underline">
            Bulk Orders
          </Link>
          <Link href="#contact" className="hover:underline">
            Contact
          </Link>
        </nav>
        <HeaderButtons />
      </header>

      {/* Hero Section */}
      <section className="bg-muted/30 flex min-h-dvh items-center px-4 py-20 pt-32 text-center lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Custom Apparel for Your Brand</h2>
          <p className="text-muted-foreground text-xl">
            Design and print high-quality t-shirts, hoodies, and more. Perfect for teams, events, and merchandise.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="lg" asChild>
              <Link href="/dashboard/new">Start Designing</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#products">View Catalog</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="bg-primary/10 rounded-full p-3">
              <Palette className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Easy Design Tool</h3>
            <p className="text-muted-foreground">
              Upload your artwork or use our intuitive design studio to create stunning apparel.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="bg-primary/10 rounded-full p-3">
              <Package className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Premium Quality</h3>
            <p className="text-muted-foreground">
              We use only the best fabrics and printing techniques to ensure your gear lasts.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="bg-primary/10 rounded-full p-3">
              <Truck className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Fast Shipping</h3>
            <p className="text-muted-foreground">
              Get your order delivered to your doorstep quickly with our reliable shipping partners.
            </p>
          </div>
        </div>
      </section>

      {/* Product List */}
      <section id="products" className="bg-muted/30 px-4 py-16 lg:px-8">
        <div className="container mx-auto space-y-10">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold">Popular Products</h2>
            <p className="text-muted-foreground">Choose from our best-selling items.</p>
          </div>
          <ProductsSection />
        </div>
      </section>
      {/* Bulk Order Section */}
      <section id="bulk" className="container mx-auto px-4 py-20 lg:px-8">
        <div className="bg-primary text-primary-foreground flex flex-col items-center justify-between gap-8 rounded-3xl p-8 md:flex-row md:p-16">
          <div className="max-w-xl space-y-4">
            <h2 className="text-3xl font-bold">Ordering for a Large Team?</h2>
            <p className="text-primary-foreground/90 text-lg">
              We offer exclusive discounts for bulk orders over 50 items. Get a dedicated account manager and free
              design assistance.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5" /> Volume discounts up to 40%
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5" /> Free sample kit
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5" /> Priority production
              </li>
            </ul>
          </div>
          <div className="bg-background text-foreground w-full max-w-md rounded-xl p-6 shadow-lg">
            <h3 className="mb-4 text-xl font-bold">Get a Bulk Quote</h3>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Work Email
                </label>
                <Input id="email" type="email" placeholder="john@company.com" />
              </div>
              <div className="space-y-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Estimated Quantity
                </label>
                <Input id="quantity" type="number" placeholder="100" />
              </div>
              <Button className="w-full">Request Quote</Button>
            </form>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-muted/30 px-4 py-16 lg:px-8">
        <div className="container mx-auto max-w-2xl space-y-8 text-center">
          <h2 className="text-3xl font-bold">Still have questions?</h2>
          <p className="text-muted-foreground">
            Our support team is here to help you with any questions about products, design, or shipping.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="lg">
              Contact Support
            </Button>
            <Button variant="outline" size="lg">
              FAQ
            </Button>
          </div>
        </div>
      </section>

      <footer className="text-muted-foreground border-t py-8 text-center text-sm">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <p>&copy; 2025 Printly. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
