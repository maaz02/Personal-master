import { Link2, MessageCircle, LayoutDashboard } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
  {
    icon: Link2,
    step: "1",
    title: "Connect your current booking source",
    description:
      "We plug into what you already use - no software to replace, no workflow to change.",
  },
  {
    icon: MessageCircle,
    step: "2",
    title: "WhatsApp confirmations + reminders go out",
    description:
      "Patients receive PDPL-ready messages, replies arrive pre-sorted, and reception can action anything with one click.",
  },
  {
    icon: LayoutDashboard,
    step: "3",
    title: "Dashboard shows who confirmed, cancelled, or needs follow-up",
    description:
      "Confirmations, reschedules, cancellations, and recalls are tracked in one place so your team never has to guess.",
  },
];

export function HowItWorksSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">How it Works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Simple setup, immediate results - fits right into your existing workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((item, index) => (
            <div
              key={item.step}
              className={`transition-all duration-700 ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <div className="bg-card rounded-2xl p-6 border border-border text-center hover-lift">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4 relative">
                  <item.icon className="w-8 h-8 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`mt-12 max-w-2xl mx-auto transition-all duration-700 delay-500 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-foreground font-medium">
              No new software for reception to learn - we fit into your existing workflow.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
