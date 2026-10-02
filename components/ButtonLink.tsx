"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
  className?: string;
  onClick?: () => void;
}

const VARIANTS = {
  solid: "bg-buoy text-abyss hover:bg-foam",
  ghost: "bg-abyss/60 text-foam ring-1 ring-inset ring-foam/25 hover:bg-foam hover:text-abyss",
} as const;

const ICON_VARIANTS = {
  solid: "bg-abyss/15",
  ghost: "bg-foam/10 group-hover:bg-abyss/10",
} as const;

/* Pill CTA that leans toward the pointer, with the arrow nested in its own circle. */
export default function ButtonLink({
  href,
  children,
  variant = "solid",
  className = "",
  onClick,
}: ButtonLinkProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 180, damping: 16, mass: 0.4 });

  const handleMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.25);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.35);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      href={href}
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ x: springX, y: springY }}
      className={`group inline-flex items-center gap-3 whitespace-nowrap rounded-full label py-2 pl-6 pr-2 transition-colors duration-500 ease-drift active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
    >
      {children}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-drift group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105 ${ICON_VARIANTS[variant]}`}
      >
        <ArrowUpRight size={16} weight="light" />
      </span>
    </motion.a>
  );
}
