import Bento from "@/components/Bento";
import DepthGauge from "@/components/DepthGauge";
import DriftGallery from "@/components/DriftGallery";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Manifesto from "@/components/Manifesto";
import Marquee from "@/components/Marquee";
import Nav from "@/components/Nav";
import NightStack from "@/components/NightStack";
import OceanCanvas from "@/components/OceanCanvas";
import PourAccordion from "@/components/PourAccordion";
import Reserve from "@/components/Reserve";
import SmoothScroll from "@/components/SmoothScroll";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <OceanCanvas />
      <div
        aria-hidden="true"
        className="grain pointer-events-none fixed inset-0 z-[60] opacity-[0.05] mix-blend-overlay"
      />
      <Nav />
      <DepthGauge />

      {/* overflow-x-clip (not hidden) so position: sticky keeps working inside. */}
      <main className="relative z-10 w-full max-w-full overflow-x-clip">
        <Hero />
        <Manifesto />
        <PourAccordion />
        <Bento />
        <Marquee />
        <NightStack />
        <DriftGallery />
        <Reserve />
      </main>

      <Footer />
    </>
  );
}
