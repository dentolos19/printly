import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";

export function ContactSection() {
  return (
    <section id="contact" className="container mx-auto px-6 py-24 lg:px-12">
      <div className="bg-muted/50 relative overflow-hidden rounded-[3rem] p-8 text-center md:p-16 lg:p-20">
        <div className="pointer-events-none absolute top-0 right-0 p-12 opacity-5">
          <HelpCircle className="size-64" />
        </div>

        <div className="relative z-10 mx-auto max-w-2xl space-y-8">
          <div className="bg-primary shadow-primary/20 mb-4 inline-flex size-16 items-center justify-center rounded-2xl text-white shadow-xl">
            <MessageCircle className="size-8" />
          </div>

          <h2 className="text-4xl font-bold tracking-tight">Need a Hand?</h2>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Whether you're stuck on a design or tracking a massive order, our dedicated support team is ready to help
            you shine.
          </p>

          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <Button
              size="lg"
              className="hover:shadow-primary/20 h-16 rounded-2xl px-10 font-bold shadow-lg transition-all"
            >
              Chat With Support
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-background h-16 rounded-2xl px-10 font-bold transition-all"
            >
              View Knowledge Base
            </Button>
          </div>

          <div className="border-border mt-12 grid grid-cols-2 gap-8 border-t pt-12 md:grid-cols-4">
            <div className="space-y-1">
              <Mail className="text-primary mx-auto mb-2 size-5" />
              <p className="text-sm font-bold">Email Us</p>
              <p className="text-muted-foreground text-xs">hello@printly.com</p>
            </div>
            <div className="space-y-1">
              <Phone className="text-primary mx-auto mb-2 size-5" />
              <p className="text-sm font-bold">Call Us</p>
              <p className="text-muted-foreground text-xs">1-800-PRINTLY</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="text-primary text-2xl leading-none font-bold">24/7</div>
              <p className="text-sm font-bold">Availability</p>
              <p className="text-muted-foreground text-xs">Always here</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="text-primary text-2xl leading-none font-bold">&lt;2h</div>
              <p className="text-sm font-bold">Response Time</p>
              <p className="text-muted-foreground text-xs">Average wait</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
