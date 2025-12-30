import { TrendingUp, Clock, DollarSign, BarChart3 } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const outcomes = [
  {
    icon: TrendingUp,
    title: "Guaranteed 50%+ recovery of lost chair time",
    description: "Driven by confirmations, reminders, and follow-ups that actually get resolved.",
  },
  {
    icon: Clock,
    title: "Save 5+ hours/week of follow-ups",
    description: "WhatsApp automation removes manual chasing so reception can stay present for patients and exceptions.",
  },
  {
    icon: DollarSign,
    title: "Fewer empty chairs from cancellations",
    description: "Cancelled appointments are flagged and tracked until a slot is handled.",
  },
  {
    icon: BarChart3,
    title: "One dashboard for confirmations, cancellations, no-shows + recalls",
    description: "Track every reply, reason, and recovery opportunity in a single organized view.",
  },
];

export function OutcomesSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center text-foreground">
            Outcomes that show the difference
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {outcomes.map((outcome, index) => (
              <div
                key={outcome.title}
                className="bg-card rounded-xl p-6 border border-border hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <outcome.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-card-foreground">{outcome.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{outcome.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-8 text-center">
            Guaranteed 50%+ recovery when our system is fully deployed.
          </p>
        </div>
      </div>
    </section>
  );
}
