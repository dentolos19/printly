import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoggedIn, LoggedOut } from "@/lib/providers/auth";
import { Check, Package, Palette, Truck } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className={"min-h-screen flex flex-col"}>
      {/* Header */}
      <header className="flex items-center justify-between h-16 border-b px-4 lg:px-8 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex items-center gap-2">
          <img src={"/icon.png"} className={"size-6"} />
          <h1 className="font-mono font-bold text-xl">Printly</h1>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
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
        <div>
          <LoggedIn>
            <Button variant="default" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </LoggedIn>
          <LoggedOut>
            <Button variant="ghost" asChild className="mr-2">
              <Link href="/auth">Log in</Link>
            </Button>
            <Button variant="default" asChild>
              <Link href="/auth?mode=signup">Sign up</Link>
            </Button>
          </LoggedOut>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 lg:px-8 text-center bg-muted/30">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Custom Apparel for Your Brand</h2>
            <p className="text-xl text-muted-foreground">
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
        <section className="py-16 px-4 lg:px-8 container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Easy Design Tool</h3>
              <p className="text-muted-foreground">
                Upload your artwork or use our intuitive design studio to create stunning apparel.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Premium Quality</h3>
              <p className="text-muted-foreground">
                We use only the best fabrics and printing techniques to ensure your gear lasts.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl">Fast Shipping</h3>
              <p className="text-muted-foreground">
                Get your order delivered to your doorstep quickly with our reliable shipping partners.
              </p>
            </div>
          </div>
        </section>

        {/* Product List */}
        <section id="products" className="py-16 px-4 lg:px-8 bg-muted/30">
          <div className="container mx-auto space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Popular Products</h2>
              <p className="text-muted-foreground">Choose from our best-selling items.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  name: "Classic Tee",
                  price: "$15",
                  desc: "100% Cotton, Heavyweight",
                },
                {
                  name: "Premium Blend",
                  price: "$22",
                  desc: "Soft Tri-blend fabric",
                },
                {
                  name: "Pullover Hoodie",
                  price: "$35",
                  desc: "Fleece lined, warm & cozy",
                },
                {
                  name: "Performance Polo",
                  price: "$28",
                  desc: "Moisture-wicking fabric",
                },
              ].map((product, i) => (
                <Card key={i}>
                  <div className="aspect-square bg-muted rounded-t-xl flex items-center justify-center text-muted-foreground">
                    Product Image
                  </div>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>{product.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold text-lg">{product.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Bulk Order Section */}
        <section id="bulk" className="py-20 px-4 lg:px-8 container mx-auto">
          <div className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
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
            <div className="bg-background text-foreground p-6 rounded-xl w-full max-w-md shadow-lg">
              <h3 className="font-bold text-xl mb-4">Get a Bulk Quote</h3>
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
        <section id="contact" className="py-16 px-4 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-2xl text-center space-y-8">
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
      </main>

      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
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
