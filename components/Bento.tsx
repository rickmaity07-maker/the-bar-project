"use client";

import Image from "next/image";
import { ArrowUpRight, MapPin } from "@phosphor-icons/react";
import Heading from "@/components/Heading";
import Reveal from "@/components/Reveal";
import { useSiteData } from "@/components/SiteData";
import { PHOTOS } from "@/lib/data";
import { useLanguage } from "@/lib/language";
import { groupHours } from "@/lib/site";

/*
  Five cells on a 12-column grid, no gaps:
    rows 1-2: A (7 cols, 2 rows) | B (5 cols) over C (5 cols)
    row 3:    D (4 cols) | E (8 cols)
  Every card is a double bezel: outer shell, inner core with a concentric radius.
*/
const SHELL = "rounded-[2rem] bg-foam/5 p-1.5 ring-1 ring-foam/10";
const CORE =
  "relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(232,239,236,0.12)]";

export default function Bento() {
  const { t } = useLanguage();
  const { week, venue } = useSiteData();

  return (
    <section id="visit" className="mx-auto w-full max-w-[1400px] scroll-mt-28 px-4 py-20 md:px-10 md:py-48">
      <Reveal>
        <h2 className="display max-w-5xl text-[clamp(2.25rem,6vw,5.5rem)] leading-[1.04] text-foam">
          <Heading parts={t.visit.title} />
        </h2>
      </Reveal>

      <div className="mt-10 grid grid-flow-dense grid-cols-1 gap-4 md:mt-20 md:grid-cols-12 md:grid-rows-[280px_280px_340px]">
        <Reveal className={`group md:col-span-7 md:row-span-2 ${SHELL}`}>
          <div className={`${CORE} min-h-[420px] bg-trench`}>
            <Image
              src={PHOTOS.barFloor}
              alt={t.visit.roomAlt}
              fill
              sizes="(min-width: 768px) 58vw, 100vw"
              className="object-cover transition-transform duration-700 ease-drift group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-abyss via-abyss/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 md:p-10">
              <h3 className="display text-3xl text-foam md:text-5xl">
                <Heading parts={t.visit.roomTitle} />
              </h3>
              <p className="mt-3 max-w-[44ch] text-base leading-relaxed text-foam/80">
                {t.visit.roomBody}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className={`md:col-span-5 ${SHELL}`}>
          <div className={`${CORE} flex flex-col justify-between gap-8 bg-buoy p-7 text-abyss md:p-9`}>
            <h3 className="display text-3xl italic">{t.visit.hoursTitle}</h3>
            <dl className="space-y-2">
              {groupHours(week).map((slot, index) => (
                <div key={index} className="flex flex-col gap-x-4 gap-y-1 md:flex-row md:items-baseline md:justify-between">
                  <dt className="label">{slot.days.map((day) => t.visit.weekdays[day]).join(", ")}</dt>
                  <dd className="display whitespace-nowrap text-2xl">
                    {slot.closed ? t.visit.closed : `${slot.open} ${t.visit.until} ${slot.close}`}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal delay={0.14} className={`md:col-span-5 ${SHELL}`}>
          <a
            href={venue.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${CORE} group flex flex-col justify-between gap-8 bg-kelp p-7 md:p-9`}
          >
            <span className="flex items-center justify-between">
              <MapPin size={28} weight="light" className="text-buoy" />
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foam/10 transition-transform duration-500 ease-drift group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105">
                <ArrowUpRight size={18} weight="light" />
              </span>
            </span>
            <span>
              <span className="display block text-3xl text-foam md:text-4xl">{venue.street}</span>
              <span className="mt-2 block text-base text-mist">
                {venue.postalCity}. {t.visit.mapsNote}
              </span>
            </span>
          </a>
        </Reveal>

        <Reveal className={`group md:col-span-4 ${SHELL}`}>
          <div className={`${CORE} min-h-[300px] bg-trench`}>
            <Image
              src={PHOTOS.terrace}
              alt={t.visit.terraceAlt}
              fill
              sizes="(min-width: 768px) 32vw, 100vw"
              className="object-cover contrast-125 grayscale transition-transform duration-700 ease-drift group-hover:scale-105"
            />
          </div>
        </Reveal>

        <Reveal delay={0.08} className={`md:col-span-8 ${SHELL}`}>
          <div
            className={`${CORE} flex flex-col justify-end bg-[radial-gradient(120%_140%_at_100%_0%,var(--color-reef)_0%,var(--color-trench)_60%)] p-7 md:p-10`}
          >
            <h3 className="display max-w-[18ch] text-3xl text-foam md:text-5xl">{t.visit.kukkiTitle}</h3>
            <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-mist">{t.visit.kukkiBody}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {t.visit.kukkiFacts.map((fact) => (
                <li key={fact} className="label rounded-full px-4 py-2 text-foam ring-1 ring-inset ring-foam/25">
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
