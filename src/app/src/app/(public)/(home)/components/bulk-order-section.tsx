import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, Check, Mail, Users } from "lucide-react";

export function BulkOrderSection() {
  return (
    <section id="bulk" className="container mx-auto px-6 py-24 lg:px-12">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white shadow-2xl">
        {/* Decorative Background Elements */}
        <div className="bg-primary/20 absolute -top-24 -right-24 size-96 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col items-stretch justify-between gap-12 p-8 md:flex-row md:p-16 lg:p-20">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur-sm">
              <Users className="size-4" />
              <span>For Teams & Big Events</span>
            </div>

            <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
              Scale Your Brand with <br />
              <span className="text-primary italic">Bulk Discounts.</span>
            </h2>

            <p className="max-w-lg text-lg leading-relaxed text-slate-400">
              Ordering for a large team or a high-profile event? Save up to 40% with our exclusive volume pricing and
              dedicated support.
            </p>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                "Volume discounts up to 40%",
                "Free professional sample kit",
                "Priority production track",
                "Dedicated Account Manager",
                "Free design assistance",
                "Global shipping logistics",
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-300">
                  <div className="bg-primary/20 text-primary flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-4" />
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="max-w-md flex-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <div className="mb-6 flex items-center gap-3">
                <Calculator className="text-primary size-6" />
                <h3 className="text-xl font-bold italic">Get an Instant Quote</h3>
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">First Name</label>
                    <Input
                      className="focus:ring-primary/50 h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Last Name</label>
                    <Input
                      className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      className="h-12 border-white/10 bg-white/5 pl-11 text-white placeholder:text-slate-600"
                      type="email"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Estimated Quantity
                  </label>
                  <Input
                    className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                    type="number"
                    placeholder="100"
                  />
                </div>

                <Button className="shadow-primary/20 h-14 w-full text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95">
                  Get My Quote
                </Button>
                <p className="pt-2 text-center text-xs text-slate-500">
                  No commitment required. We'll reach out within 2 hours.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
