import { Check } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const points = [
  "Your team keeps booking the same way (calls, WhatsApp, walk-ins).",
  "The system handles the repetitive chasing so front desk can stay present.",
  "Reception only steps in for exceptions and high-value cases.",
];

export function ReceptionReassuranceSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section id="reception" className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-4xl mx-auto text-center transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
            This helps your reception team - it doesn't replace them.
          </h2>
          <p className="text-muted-foreground mb-8 text-base md:text-lg">
            Automation stays behind the scenes. The only time reception answers is for the exceptions that matter.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-left">
            {points.map((point) => (
              <div
                key={point}
                className="bg-card rounded-2xl border border-border px-5 py-4 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
