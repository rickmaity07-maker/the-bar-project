"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Heading from "@/components/Heading";
import { NIGHTS } from "@/lib/data";
import { useLanguage } from "@/lib/language";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
  Sticky stack: each night pins at the top of the viewport and the next one
  slides over it. The covered card shrinks and dims, driven by the incoming card.
*/
export default function NightStack() {
  const root = useRef<HTMLElement>(null);
  const { t } = useLanguage();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".night-card");
        cards.forEach((card, index) => {
          if (index === cards.length - 1) return;
          const scrollTrigger = {
            trigger: cards[index + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          };
          gsap.to(card.querySelector(".night-inner"), { scale: 0.9, ease: "none", scrollTrigger });
          // Dim with a shade rather than opacity so the card behind never shows through.
          gsap.to(card.querySelector(".night-shade"), { opacity: 0.6, ease: "none", scrollTrigger });
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="nights" className="scroll-mt-28 pt-16 md:pt-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 md:px-10 md:pb-24">
        <h2 className="display max-w-5xl text-[clamp(2.25rem,6vw,5.5rem)] leading-[1.04] text-foam">
          <Heading parts={t.nights.title} />
        </h2>
      </div>

      <div className="relative">
        {NIGHTS.map((night, index) => (
          <div
            key={index}
            className="night-card sticky top-0 flex h-[100dvh] items-center px-4 pb-6 pt-24 md:px-10 xl:px-36"
          >
            <article className="night-inner relative mx-auto grid h-full w-full max-w-[1400px] origin-top grid-cols-1 overflow-hidden rounded-[2rem] bg-[linear-gradient(150deg,#2b6170_0%,#18404c_45%,#10262f_100%)] shadow-[inset_0_1px_1px_rgba(232,239,236,0.25)] ring-1 ring-foam/25 md:grid-cols-2">
              <div
                aria-hidden="true"
                className="night-shade pointer-events-none absolute inset-0 z-10 bg-abyss opacity-0"
              />
              {/* Text sits at the top so it stays readable until the next card has fully arrived. */}
              <div className="flex flex-col justify-between gap-6 p-7 md:p-12">
                <div>
                  <h3 className="display text-[clamp(3rem,6.4vw,6rem)] leading-[1] text-foam">
                    {t.nights.items[index].day}
                  </h3>
                  <p className="display mt-4 text-2xl italic text-buoy md:text-4xl">
                    {t.nights.items[index].title}
                  </p>
                  <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-foam/85 md:text-lg">
                    {t.nights.items[index].body}
                  </p>
                </div>
                <p className="display text-2xl text-foam md:text-3xl">
                  {night.from} {t.nights.until} {night.until}
                </p>
              </div>
              <div className="relative min-h-[32vh] md:min-h-0">
                <Image
                  src={night.image}
                  alt={t.nights.items[index].alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover brightness-110 saturate-110"
                />
              </div>
            </article>
          </div>
        ))}
        {/* Extra scroll so the last card holds on screen like the others before the stack lets go. */}
        <div aria-hidden="true" className="h-[70dvh]" />
      </div>
      <div aria-hidden="true" className="h-16 md:h-48" />
    </section>
  );
}
