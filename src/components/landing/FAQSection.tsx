import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useInView } from "@/hooks/useInView";

const faqs = [
  {
    question: "Will this replace our reception team?",
    answer:
      "No. It removes repetitive follow-ups so your team can focus on patients and front desk flow. Reception stays in control.",
  },
  {
    question: "Do patients talk to a bot?",
    answer:
      "No chatbot conversations. Patients receive clear confirmation messages and simple options (Confirm / Reschedule). Anything complex can be routed to your team.",
  },
  {
    question: "Is this PDPL compliant?",
    answer:
      "We build consent-first messaging, opt-out handling, and minimal-data workflows aligned with PDPL. Final compliance depends on clinic policy and patient consent.",
  },
  {
    question: "Do we need to change our booking software?",
    answer:
      "No. We connect to your current booking source and work alongside your existing workflow. Your reception team keeps using what they know.",
  },
  {
    question: "Do patients respond better on WhatsApp?",
    answer:
      "Yes. WhatsApp is where your patients already communicate. Open rates and response rates are significantly higher than SMS or email because it's their preferred channel.",
  },
  {
    question: "What happens when someone cancels?",
    answer:
      "Cancellations are flagged immediately and added to a follow-up queue. The system tracks follow-ups until they're resolved - either the patient rebooks or the slot is filled.",
  },
  {
    question: "Can we pause or adjust messages?",
    answer:
      "Yes. You have full control over message timing, content, and frequency. Pause during holidays, adjust for specific appointment types, or customize as needed.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Typically 7-14 days depending on complexity. This includes workflow mapping, message configuration, dashboard setup, and team training.",
  },
  {
    question: "What does my team need to do daily?",
    answer:
      "Mostly handle exceptions. The system automates confirmations and tracks responses. Your team focuses on patients who need personal attention or special requests.",
  },
  {
    question: "What if we already send reminders manually?",
    answer:
      "Perfect - we remove the chasing and add proper tracking. You'll see confirmation rates, no-show trends, and follow-up completion in one dashboard instead of scattered messages.",
  },
];

export function FAQSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-3xl mx-auto transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-soft transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
