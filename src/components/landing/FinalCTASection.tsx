import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { CALENDLY_POPUP_URL } from "@/lib/constants";
import { useState } from "react";
import { VideoModal } from "./VideoModal";
import { useInView } from "@/hooks/useInView";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export function FinalCTASection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_POPUP_URL });
    }
  };

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Want fewer empty chairs this month?
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            We'll show your recoverable revenue and how this fits your workflow - no pressure, just clarity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={openCalendly}
              size="lg"
              className="btn-gradient text-base px-10 py-6 text-lg animate-pulse-glow"
            >
              Book Your Free Strategy Call
            </Button>
            <Button
              size="lg"
              onClick={() => setIsVideoOpen(true)}
              className="bg-gradient-to-r from-secondary to-primary text-primary-foreground text-base px-10 py-6 text-lg group hover:shadow-[0_0_25px_hsla(199,89%,48%,0.5)] transition-all"
            >
              <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Watch Demo
            </Button>
          </div>
        </div>
      </div>

      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </section>
  );
}
