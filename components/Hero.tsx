"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ButtonLink from "@/components/ButtonLink";
import { useLanguage } from "@/lib/language";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const WORD =
  "hero-word display block select-none whitespace-nowrap wordmark text-[18.5vw] leading-none";

/*
  The hero is pinned for one extra screen of scroll while the ocean canvas sinks
  the camera. The wordmark is rendered twice: a dry copy clipped above the
  waterline and a refracted copy clipped below it. Both clips read --waterline,
  which OceanCanvas writes every frame, so the split tracks the water exactly.
*/
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const { t } = useLanguage();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero-word", { yPercent: 35, opacity: 0, duration: 1.6, ease: "expo.out", delay: 0.1 });
        gsap.from(".hero-fade", {
          opacity: 0,
          y: 24,
          duration: 1,
          ease: "expo.out",
          stagger: 0.1,
          delay: 0.6,
        });

        // The wordmark sinks and swells while the water closes over it.
        gsap.to(".hero-sink", {
          yPercent: 22,
          scale: 1.12,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: true },
        });

        // Slow swell in the refraction of the submerged half. Skipped on touch devices,
        // where re-running the filter every frame costs more than it shows at that size.
        if (window.matchMedia("(pointer: coarse)").matches) return;
        gsap.to("#undertow-noise", {
          attr: { baseFrequency: "0.01 0.034" },
          duration: 5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className="relative h-[200dvh]">
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <filter id="undertow" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            id="undertow-noise"
            type="fractalNoise"
            baseFrequency="0.006 0.022"
            numOctaves="1"
            seed="7"
          />
          <feDisplacementMap in="SourceGraphic" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        <h1 className="sr-only">{t.hero.h1}</h1>

        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
          style={{ clipPath: "inset(0 0 calc(100% - var(--waterline, 50vh)) 0)" }}
        >
          <div className="hero-sink">
            <span className={`${WORD} text-foam`}>BAR-05</span>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
          style={{ clipPath: "inset(var(--waterline, 50vh) 0 0 0)" }}
        >
          <div className="hero-sink" style={{ filter: "url(#undertow)" }}>
            <span className={`${WORD} text-[#8fd0c6]/75`}>BAR-05</span>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-10 md:flex-row md:items-end md:justify-between md:px-10 md:pb-14">
          <p className="hero-fade max-w-[40ch] text-base leading-relaxed text-foam/85 md:text-lg">
            {t.hero.sub}
          </p>
          <div className="hero-fade flex flex-wrap items-center gap-3">
            <ButtonLink href="#reserve">{t.nav.reserve}</ButtonLink>
            <ButtonLink href="#menu" variant="ghost">
              {t.hero.seeMenu}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
