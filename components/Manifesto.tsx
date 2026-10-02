"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DAY_BEATS } from "@/lib/data";
import { useLanguage } from "@/lib/language";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
  A day at the bar in three beats: 09:00, 00:00, 05:00. On desktop the stage
  pins and scroll turns the clock, each beat handing over to the next. On phones
  and under reduced motion the beats are simply stacked.
*/
export default function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const beats = gsap.utils.toArray<HTMLElement>(".beat");
        // Layout for the pinned version is applied here so the stacked fallback needs no overrides.
        gsap.set(stage.current, { height: "100dvh" });
        gsap.set(beats, { position: "absolute", inset: 0 });
        gsap.set(beats.slice(1), { autoAlpha: 0 });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: stage.current,
            start: "top top",
            end: "+=240%",
            pin: true,
            scrub: 0.6,
          },
        });

        beats.forEach((beat, index) => {
          if (index === 0) return;
          const previous = beats[index - 1];
          const at = index - 1;
          timeline
            .to(previous, { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, at + 0.35)
            .to(previous.querySelector(".beat-time"), { yPercent: -45, duration: 0.35, ease: "power1.in" }, "<")
            .to(previous.querySelector(".beat-port"), { scale: 0.85, rotate: 8, duration: 0.35, ease: "power1.in" }, "<")
            .to(beat, { autoAlpha: 1, duration: 0.35, ease: "power1.out" }, at + 0.7)
            .from(beat.querySelector(".beat-time"), { yPercent: 45, duration: 0.35, ease: "power2.out" }, "<")
            .from(beat.querySelector(".beat-port"), { scale: 0.85, rotate: -8, duration: 0.35, ease: "power2.out" }, "<");
        });
        // Hold the last beat for a moment before the section lets go.
        timeline.to({}, { duration: 0.4 });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="py-16 md:py-0">
      <div ref={stage} className="relative flex flex-col gap-20 md:gap-0">
        {DAY_BEATS.map((beat, index) => {
          const copy = t.day.beats[index];
          return (
            <div key={beat.time} className="beat flex items-center md:py-24">
              <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-10 px-4 md:grid-cols-12 md:gap-8 md:px-10 xl:pr-32">
                <div className="md:col-span-5">
                  <div className="beat-port w-[min(64vw,300px)] rounded-full bg-foam/5 p-2 ring-1 ring-foam/15 md:w-[min(32vw,440px)]">
                    <div className="relative aspect-square overflow-hidden rounded-full shadow-[inset_0_1px_1px_rgba(232,239,236,0.2)]">
                      <Image
                        src={beat.image}
                        alt={copy.alt}
                        fill
                        sizes="(min-width: 768px) 32vw, 64vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <p className="display text-2xl italic text-buoy md:text-4xl">{copy.label}</p>
                  <p className="beat-time display wordmark mt-2 text-[clamp(5rem,15vw,14rem)] leading-[0.9] text-foam">
                    {beat.time}
                  </p>
                  <p className="display mt-6 max-w-[26ch] text-[clamp(1.5rem,2.5vw,2.4rem)] leading-[1.22] text-foam/90">
                    {copy.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
