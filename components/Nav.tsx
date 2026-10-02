"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ButtonLink from "@/components/ButtonLink";
import Logo from "@/components/Logo";
import { NAV_TARGETS } from "@/lib/data";
import { LOCALES } from "@/lib/i18n";
import { setLocale, useLanguage } from "@/lib/language";
import { getLenis } from "@/lib/lenis-store";

/* German first, English second. The active language is the filled segment. */
function LanguageToggle() {
  const { locale, t } = useLanguage();

  return (
    <div role="group" aria-label={t.nav.language} className="flex items-center rounded-full bg-foam/10 p-1">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={`label min-h-10 rounded-full px-3.5 py-3 transition-colors duration-500 ease-drift active:scale-[0.96] ${
            locale === code ? "bg-foam text-abyss" : "text-foam/70 hover:text-foam"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { t } = useLanguage();

  useEffect(() => {
    const lenis = getLenis();
    if (open) {
      lenis?.stop();
      document.body.style.overflow = "hidden";
    } else {
      lenis?.start();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-40 w-[min(calc(100%-2rem),1100px)] -translate-x-1/2">
        <nav
          aria-label={t.nav.mainLabel}
          className="flex h-16 items-center justify-between gap-2 rounded-full bg-abyss/60 pl-3 pr-2 md:gap-4 md:pl-4 md:pr-3 shadow-[inset_0_1px_0_rgba(232,239,236,0.12)] ring-1 ring-foam/10 backdrop-blur-xl"
        >
          <a href="#top" aria-label={t.nav.home} className="flex min-h-11 items-center">
            <Logo tagline={t.nav.logoSub} />
          </a>

          <ul className="hidden items-center gap-7 lg:flex">
            {NAV_TARGETS.map((href, index) => (
              <li key={href}>
                <a
                  href={href}
                  className="label text-foam/75 transition-colors duration-500 ease-drift hover:text-foam"
                >
                  {t.nav.links[index]}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <div className="hidden lg:block">
              <ButtonLink href="#reserve">{t.nav.reserve}</ButtonLink>
            </div>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              onClick={() => setOpen((value) => !value)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-foam/10 transition-transform duration-500 ease-drift active:scale-95 lg:hidden"
            >
              <span
                className={`absolute h-px w-5 bg-foam transition-transform duration-500 ease-drift ${
                  open ? "rotate-45" : "-translate-y-[4px]"
                }`}
              />
              <span
                className={`absolute h-px w-5 bg-foam transition-transform duration-500 ease-drift ${
                  open ? "-rotate-45" : "translate-y-[4px]"
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.menuLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-50 flex flex-col justify-between bg-abyss/90 px-6 pb-10 pt-28 backdrop-blur-3xl lg:hidden"
          >
            <button
              type="button"
              aria-label={t.nav.closeMenu}
              onClick={() => setOpen(false)}
              className="absolute right-7 top-[26px] flex h-11 w-11 items-center justify-center rounded-full bg-foam/10"
            >
              <span className="absolute h-px w-5 rotate-45 bg-foam" />
              <span className="absolute h-px w-5 -rotate-45 bg-foam" />
            </button>

            <ul className="flex flex-col gap-2">
              {NAV_TARGETS.map((href, index) => (
                <li key={href} className="overflow-hidden">
                  <motion.a
                    href={href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { y: 64, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.8,
                      delay: 0.1 + index * 0.07,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="display block py-1 text-6xl italic text-foam"
                  >
                    {t.nav.links[index]}
                  </motion.a>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <ButtonLink href="#reserve" onClick={() => setOpen(false)}>
                {t.nav.reserve}
              </ButtonLink>
              <LanguageToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
