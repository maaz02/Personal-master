import { CalendarX, MessageSquareWarning, Smartphone, Eye } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const painPoints = [
  {
    icon: CalendarX,
    title: "Empty chairs = AED walking out the door",
    description: "Every no-show or last-minute cancel is revenue you can't recover. At AED 400/appointment, just 3 gaps/day costs you AED 26,400/month.",
  },
  {
    icon: MessageSquareWarning,
    title: "Patients slip through the cracks",
    description: "Treatment plans stall because follow-ups don't happen. Rescheduled patients never actually rebook. Revenue leaks without you noticing.",
  },
  {
    icon: Smartphone,
    title: "WhatsApp scattered across personal phones",
    description: "No single view of who confirmed or who needs follow-up. Staff leave and take message history with them. No accountability.",
  },
  {
    icon: Eye,
    title: "Flying blind on clinic performance",
    description: "You don't know your real no-show rate, which days leak the most, or if reminders are actually working. Just a gut feeling something's off.",
  },
];

export function PainPointsSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section id="problems" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
            Sound Familiar?
          </h2>
          <p className="text-muted-foreground text-lg">
            If any of these happen weekly, this is for you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {painPoints.map((point, index) => (
            <div
              key={point.title}
              className={`bg-card rounded-xl p-6 border border-border hover-lift transition-all duration-700 ${
                isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                <point.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-card-foreground">{point.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
