"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Heading from "@/components/Heading";
import { ROOM } from "@/lib/data";
import { useLanguage } from "@/lib/language";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
  Horizontal pan: on desktop the section pins and vertical scroll carries the
  photos sideways, each one growing into focus as it arrives. On phones and
  under reduced motion it is a plain swipeable row.
*/
export default function DriftGallery() {
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const trackEl = track.current;
        if (!trackEl) return;
        const distance = () => trackEl.scrollWidth - window.innerWidth;

        const pan = gsap.to(trackEl, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: wrap.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        gsap.utils.toArray<HTMLElement>(".drift-item").forEach((item) => {
          gsap.fromTo(
            item,
            { scale: 0.8, opacity: 0.25 },
            {
              scale: 1,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: item,
                containerAnimation: pan,
                start: "left right",
                end: "left 55%",
                scrub: true,
              },
            },
          );
        });
      });
    },
    { scope: wrap },
  );

  return (
    <section ref={wrap} id="room" className="scroll-mt-28 py-20 md:h-[100dvh] md:overflow-hidden md:py-0">
      <div
        ref={track}
        className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 items-center gap-5 overflow-x-auto px-4 md:h-full md:w-max md:snap-none md:gap-10 md:overflow-visible md:px-10 md:pt-16"
      >
        <div className="w-[82vw] shrink-0 snap-start md:w-[46vw] md:pr-10">
          <h2 className="display text-[clamp(2.25rem,6vw,5.5rem)] leading-[1.04] text-foam">
            <Heading parts={t.gallery.title} />
          </h2>
          <p className="mt-6 max-w-[42ch] text-base leading-relaxed text-mist md:text-lg">
            {t.gallery.body}
          </p>
        </div>

        {ROOM.map((photo, index) => (
          <figure
            key={photo.src}
            className={`drift-item group w-[78vw] shrink-0 snap-center rounded-[2rem] bg-foam/5 p-1.5 ring-1 ring-foam/10 ${photo.width}`}
          >
            <div
              className={`relative overflow-hidden rounded-[calc(2rem-0.375rem)] md:max-h-[70dvh] ${photo.ratio}`}
            >
              <Image
                src={photo.src}
                alt={t.gallery.alts[index]}
                fill
                sizes="(min-width: 768px) 46vw, 78vw"
                className="object-cover transition-transform duration-700 ease-drift group-hover:scale-105"
              />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
