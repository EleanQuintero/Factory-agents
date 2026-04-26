import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { CapabilitiesSection } from "@/components/landing/capabilities-section";
import { ProtocolSection } from "@/components/landing/protocol-section";
import { WaitlistSection } from "@/components/landing/waitlist-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#141517] text-[#F1E6D4] font-mono">
      <Navbar />
      <HeroSection />
      <CapabilitiesSection />
      <ProtocolSection />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
