"use client";

import { BulkOrderSection } from "./components/bulk-order-section";
import { ContactSection } from "./components/contact-section";
import { FeaturesSection } from "./components/features-section";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { HeroSection } from "./components/hero-section";
import { ProductsListSection } from "./components/products-list-section";

export default function Page() {
  return (
    <div>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <ProductsListSection />
      <BulkOrderSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
