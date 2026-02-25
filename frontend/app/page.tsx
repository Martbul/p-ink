import { HeroSection } from "@/components/hero_section";

import { HomeNav } from "@/components/nav";
import { CtaSection, FeaturesSection, HomeFooter, HowItWorks } from "@/components/sections";

export default function HomePage() {
  return (
    <>
      <HomeNav />
      <HeroSection />

      {/* Fade divider */}
      <div className="divider-fade max-w-2xl mx-auto" />

      <HowItWorks />
      <FeaturesSection />
      <CtaSection />
      <HomeFooter />
    </>
  );
}
