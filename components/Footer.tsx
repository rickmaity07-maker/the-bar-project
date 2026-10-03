"use client";

import { useSiteData } from "@/components/SiteData";
import { NAV_TARGETS, VENUE } from "@/lib/data";
import { useLanguage } from "@/lib/language";
import { groupHours } from "@/lib/site";

export default function Footer() {
  const { t } = useLanguage();
  const { week } = useSiteData();

  return (
    <footer className="relative z-10 overflow-hidden px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 md:px-10 md:pt-16">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-10 border-t border-foam/15 pt-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="label text-foam">{t.footer.findUs}</h2>
          <address className="mt-4 space-y-1 text-base not-italic text-foam/85">
            <p>{t.visit.street}</p>
            <p>{t.visit.city}</p>
          </address>
        </div>

        <div>
          <h2 className="label text-foam">{t.footer.hours}</h2>
          <ul className="mt-2 text-base text-foam/85 md:mt-4 md:space-y-1">
            {groupHours(week).map((slot, index) => (
              <li key={index}>
                {slot.days.map((day) => t.visit.weekdays[day]).join(", ")}:{" "}
                {slot.closed ? t.visit.closed : `${slot.open} ${t.visit.until} ${slot.close}`}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="label text-foam">{t.footer.contact}</h2>
          <ul className="mt-2 text-base text-foam/85 md:mt-4 md:space-y-1">
            <li>{VENUE.contact}</li>
            <li>
              <a href={VENUE.phoneHref} className="inline-flex min-h-11 items-center transition-colors duration-500 ease-drift hover:text-foam md:min-h-0">
                {VENUE.phone}
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label={t.footer.navLabel}>
          <h2 className="label text-foam">{t.footer.onThisPage}</h2>
          <ul className="mt-2 text-base text-foam/85 md:mt-4 md:space-y-1">
            {NAV_TARGETS.map((href, index) => (
              <li key={href}>
                <a href={href} className="inline-flex min-h-11 items-center transition-colors duration-500 ease-drift hover:text-foam md:min-h-0">
                  {t.nav.links[index]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p
        aria-hidden="true"
        className="display wordmark mx-auto mt-16 w-full max-w-[1400px] select-none text-center text-[21vw] leading-[0.85] text-foam/90 min-[1400px]:text-[294px]"
      >
        BAR-05
      </p>

      <p className="mx-auto mt-8 flex w-full max-w-[1400px] flex-wrap gap-x-6 gap-y-2 text-sm text-mist">
        <span>{t.footer.credit}</span>
        <a href="/datenschutz" className="underline-offset-4 transition-colors hover:text-foam hover:underline">
          {t.footer.privacy}
        </a>
      </p>
    </footer>
  );
}
