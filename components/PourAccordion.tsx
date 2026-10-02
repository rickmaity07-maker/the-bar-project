"use client";

import { useState, type PointerEvent } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import Heading from "@/components/Heading";
import Reveal from "@/components/Reveal";
import { useSiteData } from "@/components/SiteData";
import { useLanguage } from "@/lib/language";

/*
  The menu as oversized type. Tabs switch the category, rows dim their
  neighbours on hover, and a small porthole trails the cursor showing the drink
  being pointed at.
*/
export default function PourAccordion() {
  const [active, setActive] = useState(0);
  // Index of the drink under the cursor, or null when the viewer is hidden.
  const [hovered, setHovered] = useState<number | null>(null);
  // True while the cursor is on a drink's name, where the viewer stays out of the way.
  const [overName, setOverName] = useState(false);
  const reduce = useReducedMotion();
  const { t, locale } = useLanguage();
  const { menu } = useSiteData();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 140, damping: 18, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 140, damping: 18, mass: 0.5 });

  // The owner can remove categories in the portal, so the open tab may no longer exist.
  const category = menu[active] ?? menu[0];
  const drinks = category.items;

  const track = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    x.set(event.clientX);
    y.set(event.clientY);
  };

  const hovering = hovered !== null && !overName;

  return (
    <section id="menu" className="mx-auto w-full max-w-[1400px] scroll-mt-28 px-4 py-20 md:px-10 md:py-48">
      <Reveal>
        <h2 className="display max-w-5xl text-[clamp(2.25rem,6vw,5.5rem)] leading-[1.04] text-foam">
          <Heading parts={t.menu.title} />
        </h2>
      </Reveal>

      <Reveal className="mt-12 md:mt-16">
        <div role="tablist" aria-label={t.menu.sections} className="flex flex-wrap gap-2">
          {menu.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`pour-tab-${index}`}
                aria-selected={selected}
                aria-controls="pour-panel"
                onClick={() => {
                  setActive(index);
                  setHovered(null);
                  setOverName(false);
                }}
                className={`label relative rounded-full px-6 py-3.5 transition-colors duration-500 ease-drift active:scale-[0.98] ${
                  selected ? "text-abyss" : "text-foam ring-1 ring-inset ring-foam/25 hover:bg-foam/10"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="pour-tab"
                    className="absolute inset-0 rounded-full bg-buoy"
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  />
                )}
                <span className="relative">{item.name[locale]}</span>
              </button>
            );
          })}
        </div>

        <div
          id="pour-panel"
          role="tabpanel"
          aria-labelledby={`pour-tab-${active}`}
          onPointerMove={track}
          onPointerLeave={() => {
            setHovered(null);
            setOverName(false);
          }}
          className="mt-10 md:mt-14 md:min-h-[38rem]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              <p className="max-w-[52ch] text-base leading-relaxed text-mist md:text-lg">
                {category.line[locale]} {t.menu.priceNote}
              </p>
              <ul className="group/list mt-8">
                {drinks.map((item, index) => (
                  <motion.li
                    key={item.id}
                    initial={reduce ? false : { opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") setHovered(index);
                      }}
                      className="group/row flex items-baseline justify-between gap-3 py-2.5 md:gap-6 transition-opacity duration-500 ease-drift group-hover/list:opacity-35 hover:!opacity-100 md:py-3"
                    >
                      <span className="relative mr-1 h-12 w-12 shrink-0 self-center overflow-hidden rounded-full ring-1 ring-foam/20 md:hidden">
                        <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-baseline">
                        {/*
                          Quiet zone: the name plus a margin around it. The photo hides while the
                          cursor is here so it never covers the word being read. The zone itself
                          stays still; only the text inside slides on hover.
                        */}
                        <span
                          onPointerEnter={() => setOverName(true)}
                          onPointerLeave={() => setOverName(false)}
                          className="-my-2 py-2 md:-my-3 md:py-3 md:pr-10"
                        >
                          <span className="display block text-[clamp(1.9rem,5.4vw,5rem)] leading-[1.12] text-foam transition-transform duration-700 ease-drift group-hover/row:translate-x-4 group-hover/row:italic">
                            {item.name[locale]}
                          </span>
                        </span>
                        {item.note[locale] && (
                          <span className="text-sm text-mist md:max-w-[46ch] md:text-base">
                            {item.note[locale]}
                          </span>
                        )}
                      </span>
                      <span className="display whitespace-nowrap text-2xl italic text-buoy md:text-4xl">
                        {item.price}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-10 max-w-[52ch] text-sm leading-relaxed text-mist md:text-base">
                <span className="label mb-2 block text-foam">{t.menu.allergensTitle}</span>
                {t.menu.allergens}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>

      {/* Fixed to the viewport, so it lives outside the transformed Reveal wrappers. */}
      <motion.div
        aria-hidden="true"
        style={{ x: springX, y: springY }}
        className="pointer-events-none fixed left-0 top-0 z-30 hidden md:block"
      >
        <motion.div
          animate={{ scale: hovering ? 1 : 0, opacity: hovering ? 1 : 0, rotate: hovering ? 0 : -20 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className="ml-8 -mt-[4.5rem] h-36 w-36 rounded-full bg-foam/10 p-1 ring-1 ring-foam/20"
        >
          <div className="relative h-full w-full overflow-hidden rounded-full">
            {/* Every photo of the open category stays mounted so switching rows is an instant crossfade. */}
            {drinks.map((drink, index) => (
              <Image
                key={drink.id}
                src={drink.image}
                alt=""
                fill
                sizes="144px"
                className={`object-cover transition-opacity duration-300 ease-drift ${
                  index === hovered ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
