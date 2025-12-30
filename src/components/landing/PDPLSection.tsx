import { Shield, Scale, Award } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const features = [
  {
    icon: Shield,
    title: "Built for UAE's PDPL from day one",
    description:
      "The UAE Personal Data Protection Law (Federal Decree-Law No. 45/2021) requires businesses to handle patient data with explicit consent and clear purpose. Our workflows are built around these requirements - never retrofitted.",
  },
  {
    icon: Scale,
    title: "Compliant messaging workflows",
    description:
      "Every WhatsApp template follows PDPL guidelines: clear purpose, minimal data collection, secure storage, and proper access controls. Your clinic stays audit-ready without extra work.",
  },
  {
    icon: Award,
    title: "What other software misses",
    description:
      "Most booking tools bolt on compliance after launch. We're UAE-first with Arabic/English templates, local residency awareness, and workflows designed for GCC healthcare privacy.",
  },
];

export function PDPLSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section id="pdpl" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">UAE Compliance Built-In</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              PDPL-Compliant Patient Messaging
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The UAE has strict data protection laws. Most clinic software ignores them. We don't.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`bg-card rounded-xl p-6 border border-border hover-lift transition-all duration-700 ${
                  isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-card-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <div className="inline-block bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 px-6 py-3 rounded-xl">
              <p className="text-sm text-foreground font-medium">
                We keep PDPL at the core so you can focus on patient care, not paperwork.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
