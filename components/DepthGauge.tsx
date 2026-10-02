"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { MAX_DEPTH } from "@/lib/data";
import { useLanguage } from "@/lib/language";

function zoneIndex(depth: number) {
  if (depth < 200) return 0;
  if (depth < 1000) return 1;
  return 2;
}

/* Reads page scroll as metres below the surface. Text is written straight to the DOM, no re-renders. */
export default function DepthGauge() {
  const { scrollY, scrollYProgress } = useScroll();
  const { t } = useLanguage();
  const zones = t.gauge.zones;
  const metresRef = useRef<HTMLSpanElement>(null);
  const zoneRef = useRef<HTMLSpanElement>(null);

  // Depth follows scroll, then returns to zero over the last screen as the page surfaces.
  const depthRatio = useTransform(scrollYProgress, (progress) => {
    if (typeof window === "undefined") return 0;
    const max = progress > 0 ? scrollY.get() / progress : 0;
    const surfacing = Math.min(
      1,
      Math.max(0, (scrollY.get() - (max - window.innerHeight)) / window.innerHeight),
    );
    const rise = surfacing * surfacing * (3 - 2 * surfacing);
    return progress * (1 - rise);
  });
  const markerY = useTransform(depthRatio, [0, 1], [0, 152]);

  useMotionValueEvent(depthRatio, "change", (value) => {
    const depth = Math.round(value * MAX_DEPTH);
    if (metresRef.current) metresRef.current.textContent = depth.toLocaleString("en-US");
    if (zoneRef.current) zoneRef.current.textContent = zones[zoneIndex(depth)];
  });

  // Re-label the current zone straight away when the language changes.
  useEffect(() => {
    const depth = Math.round(depthRatio.get() * MAX_DEPTH);
    if (zoneRef.current) zoneRef.current.textContent = zones[zoneIndex(depth)];
  }, [zones, depthRatio]);

  return (
    <aside
      aria-hidden="true"
      className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-4 xl:flex"
    >
      <div className="text-right font-mono text-xs text-foam/80">
        <span ref={metresRef}>0</span> m
      </div>
      <div className="relative h-40 w-px bg-foam/20">
        <motion.span
          style={{ y: markerY }}
          className="absolute -left-[3px] top-0 block h-2 w-[7px] rounded-full bg-buoy"
        />
      </div>
      <span ref={zoneRef} className="text-right font-mono text-[11px] text-mist">
        {zones[0]}
      </span>
    </aside>
  );
}
