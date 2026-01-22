import { Palette, ShieldCheck, Zap } from "lucide-react";

const features = [
  {
    icon: Palette,
    title: "Infinite Creativity",
    description: "Upload your own masterpiece or build from scratch in our pro-grade studio.",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Premium Standards",
    description: "Hand-picked fabrics and state-of-the-art printing that won't fade or crack.",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    icon: Zap,
    title: "Express Delivery",
    description: "Lightning-fast production and worldwide shipping to meet your tightest deadlines.",
    color: "bg-amber-500/10 text-amber-500",
  },
];

export function FeaturesSection() {
  return (
    <section className="container mx-auto px-6 py-24 lg:px-12">
      <div className="mx-auto mb-16 max-w-2xl space-y-4 text-center">
        <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">Why Brands Choose Printly</h2>
        <p className="text-muted-foreground text-lg">
          We've redefined custom printing with a focus on quality, speed, and effortless design.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="group border-border bg-card hover:shadow-primary/5 relative rounded-3xl border p-8 transition-all hover:-translate-y-1 hover:shadow-2xl"
          >
            <div
              className={`mb-6 inline-flex rounded-2xl p-4 transition-transform group-hover:scale-110 ${feature.color}`}
            >
              <feature.icon className="size-8" />
            </div>
            <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            <div className="via-primary/20 absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
