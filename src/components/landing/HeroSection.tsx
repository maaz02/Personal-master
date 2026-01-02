import { Button } from "@/components/ui/button";
import { Check, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { VideoModal } from "./VideoModal";
import { HeroCalculator } from "./HeroCalculator";
import { CALENDLY_POPUP_URL } from "@/lib/constants";
import { WhatsAppDashboardPreview } from "./WhatsAppDashboardPreview";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

const heroBullets = [
  "Recover 50%+ of lost chair time - guaranteed",
  "Recover AED 130,000-180,000/year in chair time",
  "Cancelled appointments get flagged + followed up until handled",
  "One dashboard for confirmations, cancellations, no-shows + recalls",
];

const trustChips = [
  { label: "PDPL-first", href: "#pdpl" },
  { label: "Reception stays in control", href: "#reception" },
  { label: "Works with your current workflow", href: "#how-it-works" },
];

export function HeroSection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  useEffect(() => {
    // Load Calendly widget script
    const link = document.createElement("link");
    link.href = "https://assets.calendly.com/assets/external/widget.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_POPUP_URL });
    }
  };

  return (
    <section className="pt-24 md:pt-36 pb-16 md:pb-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Content */}
          <div className="w-full max-w-3xl mx-auto lg:mx-0 animate-fade-in-up">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground mb-6">
              Turn empty dental chairs into{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                recovered revenue
              </span>
            </h1>

            <p className="text-base md:text-lg text-foreground/80 mb-3 leading-relaxed max-w-xl">
              WhatsApp confirmations, reminders, and a tracking dashboard that stop no-shows and late cancellations.
            </p>
            <p className="text-base md:text-lg text-foreground/80 mb-7 leading-relaxed max-w-xl">
              Keep your reception workflow the same while we handle confirmations, cancellations, and follow-ups.
            </p>

            {/* Benefits */}
            <ul className="space-y-3 mb-8">
              {heroBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-foreground">{bullet}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4 mb-8 w-full">
              <Button
                size="lg"
                onClick={openCalendly}
                className="btn-gradient text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 text-center w-full sm:w-auto animate-pulse-glow"
              >
                Book a 15-min Demo Call
              </Button>
              <Button
                size="lg"
                onClick={() => setIsVideoOpen(true)}
                className="bg-gradient-to-r from-secondary to-primary text-primary-foreground text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 text-center w-full sm:w-auto group hover:shadow-[0_0_25px_hsla(199,89%,48%,0.5)] transition-all"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch 2-min Demo
              </Button>
            </div>

            {/* Trust Chips */}
            <div className="flex flex-wrap gap-3">
              {trustChips.map((chip) => (
                <a
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center px-3 py-1.5 bg-muted/30 text-foreground/90 text-sm font-medium rounded-full border border-border hover:bg-muted/50 transition-colors"
                >
                  {chip.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right - Calculator */}
          <div
            className="w-full mt-10 lg:mt-0 flex justify-center lg:justify-end animate-fade-in-up lg:animate-none lg:opacity-100"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-full max-w-xl space-y-6">
              <WhatsAppDashboardPreview />
              <div className="pt-2 lg:pt-6">
                <HeroCalculator />
              </div>
            </div>
          </div>
        </div>
      </div>

      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </section>
  );
}
