"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";

/* Shared building blocks for the admin portal. */

const VARIANTS = {
  solid: "bg-buoy text-abyss hover:bg-foam",
  ghost: "text-foam ring-1 ring-inset ring-foam/25 hover:bg-foam hover:text-abyss",
  danger: "text-buoy ring-1 ring-inset ring-buoy/40 hover:bg-buoy hover:text-abyss",
} as const;

interface SubmitProps {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  /* Asks before submitting, for deletions. */
  confirm?: string;
  name?: string;
  value?: string;
  className?: string;
}

/* Disables itself while its form is being sent. */
export function Submit({ children, variant = "solid", confirm, name, value, className = "" }: SubmitProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={`label inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full px-4 py-2.5 transition-colors duration-300 ease-drift active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const LINKS = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/reservations", label: "Reservierungen" },
  { href: "/admin/menu", label: "Karte & Preise" },
  { href: "/admin/hours", label: "Öffnungszeiten" },
  { href: "/admin/users", label: "Nutzer & Rollen" },
  { href: "/admin/activity", label: "Aktivität" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Verwaltung" className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`label whitespace-nowrap rounded-full px-4 py-3 transition-colors duration-300 ease-drift ${
              active ? "bg-foam text-abyss" : "text-foam/70 hover:bg-foam/10 hover:text-foam"
            }`}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
