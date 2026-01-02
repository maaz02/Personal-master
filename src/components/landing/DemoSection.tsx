import { Check } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { LOOM_EMBED_URL } from "@/lib/constants";

const features = [
  "Confirmation tracking",
  "Cancellation follow-up queue",
  "Recall messages for patients who didn't rebook",
  "Weekly snapshot for owners/managers",
];

export function DemoSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section id="demo" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
            See the system in 2 minutes
          </h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-center max-w-6xl mx-auto">
          {/* Video Embed */}
          <div
            className={`lg:col-span-3 transition-all duration-700 ${
              isInView
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-8"
            }`}
          >
            <div className="bg-card rounded-2xl overflow-hidden shadow-[0_22px_60px_rgba(2,6,23,0.4)] border border-border">
              <div className="aspect-video">
                <iframe
                  src={LOOM_EMBED_URL}
                  className="w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                />
              </div>
            </div>
          </div>

          {/* Features List */}
          <div
            className={`lg:col-span-2 transition-all duration-700 delay-200 ${
              isInView
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            }`}
          >
            <div className="bg-card rounded-2xl p-6 md:p-8 border border-border shadow-lg">
              <h3 className="font-semibold text-lg mb-6 text-foreground">What you'll see:</h3>
              <ul className="space-y-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
