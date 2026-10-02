import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav, Submit } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { signOut } from "../login/actions";

export const metadata: Metadata = {
  title: "Verwaltung | Bar-05",
  robots: { index: false },
};

/* Only owners get past this point; everyone else is sent to the shared login. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await requireOwner();

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-10 lg:h-[calc(100dvh-5rem)] lg:w-60 lg:shrink-0">
        <div className="flex items-center justify-between gap-4 lg:block">
          <a href="/admin" className="block">
            <span className="display wordmark block text-2xl tracking-[0.14em] text-foam">BAR-05</span>
            <span className="label mt-1 block text-[9px] text-foam/60">Verwaltung</span>
          </a>
          <Link href="/" className="label text-mist transition-colors hover:text-foam lg:mt-4 lg:inline-block">
            Zur Website ↗
          </Link>
        </div>
        <AdminNav />
        <div className="hidden lg:mt-auto lg:block">
          <p className="break-all text-sm text-foam">{me.email}</p>
          <p className="label mt-1 text-[10px] text-buoy">Inhaber</p>
          <form action={signOut} className="mt-4">
            <Submit variant="ghost">Abmelden</Submit>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 pb-16">{children}</main>
      <form action={signOut} className="lg:hidden">
        <Submit variant="ghost">Abmelden ({me.email})</Submit>
      </form>
    </div>
  );
}
