import type { ReactNode } from "react";

/* Server-side layout pieces for the admin pages. */

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="display text-[clamp(2.25rem,4vw,3.5rem)] leading-none text-foam">{title}</h1>
      {children}
    </header>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.75rem] bg-foam/5 p-1.5 ring-1 ring-foam/10 ${className}`}>
      <div className="h-full rounded-[calc(1.75rem-0.375rem)] bg-trench p-5 shadow-[inset_0_1px_1px_rgba(232,239,236,0.1)] md:p-7">
        {children}
      </div>
    </section>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <p
      role="status"
      className={`mb-6 rounded-2xl px-5 py-4 text-sm ${
        tone === "warn" ? "bg-buoy/15 text-buoy ring-1 ring-buoy/30" : "bg-foam/10 text-foam"
      }`}
    >
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-sm text-mist">{children}</p>;
}
