"use client";

import { Waves } from "@phosphor-icons/react";
import { useLanguage } from "@/lib/language";

/* The single marquee on the page. The list is rendered twice so the loop is seamless. */
export default function Marquee() {
  const { t } = useLanguage();

  return (
    <div aria-hidden="true" className="w-full overflow-hidden py-10">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {t.marquee.map((word) => (
              <li key={word} className="flex items-center">
                <span className="display whitespace-nowrap px-8 text-[clamp(3rem,8vw,7rem)] italic leading-[1.2] text-foam/90">
                  {word}
                </span>
                <Waves size={48} weight="light" className="shrink-0 text-buoy" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
