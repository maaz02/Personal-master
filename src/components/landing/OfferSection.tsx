import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/useInView";
import { CALENDLY_POPUP_URL } from "@/lib/constants";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

const deliverables = [
  "Full setup + workflow mapping (we do it for you)",
  "WhatsApp message flows + smart escalation rules",
  "Dashboard configured to your clinic's needs",
  "Team handover + training (usually 30 minutes)",
];

export function OfferSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_POPUP_URL });
    }
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-3xl mx-auto transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full border border-success/20 mb-4">
              <Zap className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Quick Setup</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Go live without disruption
            </h2>
            <p className="text-muted-foreground text-lg">
              We handle everything. You just show us your current workflow.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <ul className="space-y-4 mb-8">
              {deliverables.map((item) => (
                <li key={item} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="text-lg text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4 mb-8">
              <p className="text-foreground font-medium text-center">
                If we don't get your system live as agreed, we keep working until it is - no extra charge.
              </p>
            </div>

            <div className="text-center">
              <Button onClick={openCalendly} size="lg" className="btn-gradient px-10 py-6 text-lg">
                Book Your Setup Call
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
