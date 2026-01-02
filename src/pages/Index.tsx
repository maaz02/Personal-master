import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { PainPointsSection } from "@/components/landing/PainPointsSection";
import { OutcomesSection } from "@/components/landing/OutcomesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { PDPLSection } from "@/components/landing/PDPLSection";
import { OfferSection } from "@/components/landing/OfferSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { WaveBackground } from "@/components/WaveBackground";
import { BRAND_NAME } from "@/lib/constants";
import { useEffect } from "react";
import { ReceptionReassuranceSection } from "@/components/landing/ReceptionReassuranceSection";

const Index = () => {
  useEffect(() => {
    document.title = `${BRAND_NAME} | UAE Dental Clinic Automation - WhatsApp Reminders & No-Show Reduction`;
  }, []);

  return (
    <div className="min-h-screen relative">
      <WaveBackground />
      <Navbar />
      <main>
        <HeroSection />
        <TrustedBySection />
        <ReceptionReassuranceSection />
        <PainPointsSection />
        <OutcomesSection />
        <HowItWorksSection />
        <DemoSection />
        <PDPLSection />
        <OfferSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
