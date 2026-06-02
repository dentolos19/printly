import { createFileRoute } from "@tanstack/react-router";

import { BulkOrderSection } from "#/routes/(public)/-home-components/bulk-order-section";
import { ContactSection } from "#/routes/(public)/-home-components/contact-section";
import { FeaturesSection } from "#/routes/(public)/-home-components/features-section";
import { Footer } from "#/routes/(public)/-home-components/footer";
import { Header } from "#/routes/(public)/-home-components/header";
import { HeroSection } from "#/routes/(public)/-home-components/hero-section";
import { ProductsListSection } from "#/routes/(public)/-home-components/products-list-section";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className={"bg-background flex flex-col"}>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <ProductsListSection />
      <BulkOrderSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
