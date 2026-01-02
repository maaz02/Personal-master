import { useInView } from "@/hooks/useInView";
import { BRAND_NAME } from "@/lib/constants";

const logoNames = [
  "Crescent Dental",
  "Oasis Smiles",
  "Palm Harbor Clinic",
  "BrightLine Dental",
  "Atlas Dental",
  "Pearl Street Dental",
  "Skyline Dental",
  "Lighthouse Dental",
  "Sunrise Dental",
  "Harborview Dental",
  "Desert Bloom Clinic",
  "CityCare Dental",
];

export function TrustedBySection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`text-center transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Trusted by UAE dental clinics
          </p>
          <h2 className="mt-3 text-xl md:text-2xl font-semibold text-foreground">
            Front desks use {BRAND_NAME} to keep chairs full
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Confirmations, follow-ups, and recalls run on one calm workflow.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 py-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent" />

          <div className="flex w-max items-center animate-[marquee_32s_linear_infinite] motion-reduce:animate-none">
            <div className="flex items-center gap-6 px-4">
              {logoNames.map((logo) => (
                <div
                  key={logo}
                  className="flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-5 py-2 text-sm font-semibold text-foreground/75 shadow-[0_12px_30px_rgba(2,6,23,0.35)]"
                >
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  <span className="whitespace-nowrap">{logo}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 px-4" aria-hidden="true">
              {logoNames.map((logo) => (
                <div
                  key={`${logo}-duplicate`}
                  className="flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-5 py-2 text-sm font-semibold text-foreground/75 shadow-[0_12px_30px_rgba(2,6,23,0.35)]"
                >
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  <span className="whitespace-nowrap">{logo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
