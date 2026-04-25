import { HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "#/components/ui/button";

export function ContactSection() {
  return (
    <section className="container mx-auto px-6 py-24 lg:px-12" id="contact">
      <div className="relative overflow-hidden rounded-[3rem] bg-muted/50 p-8 text-center md:p-16 lg:p-20">
        <div className="pointer-events-none absolute top-0 right-0 p-12 opacity-5">
          <HelpCircle className="size-64" />
        </div>

        <div className="relative z-10 mx-auto max-w-2xl space-y-8">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-primary text-white shadow-primary/20 shadow-xl">
            <MessageCircle className="size-8" />
          </div>

          <h2 className="font-bold text-4xl tracking-tight">Need a Hand?</h2>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Whether you're stuck on a design or tracking a massive order, our dedicated support team is ready to help
            you shine.
          </p>

          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <Button
              className="h-16 rounded-2xl px-10 font-bold shadow-lg transition-all hover:shadow-primary/20"
              size="lg"
            >
              Chat With Support
            </Button>
            <Button
              className="h-16 rounded-2xl bg-background px-10 font-bold transition-all"
              size="lg"
              variant="outline"
            >
              View Knowledge Base
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 border-border border-t pt-12 md:grid-cols-4">
            <div className="space-y-1">
              <Mail className="mx-auto mb-2 size-5 text-primary" />
              <p className="font-bold text-sm">Email Us</p>
              <p className="text-muted-foreground text-xs">hello@printly.com</p>
            </div>
            <div className="space-y-1">
              <Phone className="mx-auto mb-2 size-5 text-primary" />
              <p className="font-bold text-sm">Call Us</p>
              <p className="text-muted-foreground text-xs">1-800-PRINTLY</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="font-bold text-2xl text-primary leading-none">24/7</div>
              <p className="font-bold text-sm">Availability</p>
              <p className="text-muted-foreground text-xs">Always here</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="font-bold text-2xl text-primary leading-none">&lt;2h</div>
              <p className="font-bold text-sm">Response Time</p>
              <p className="text-muted-foreground text-xs">Average wait</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
