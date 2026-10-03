"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { SessionUser } from "@/lib/auth";
import { useLanguage } from "@/lib/language";
import { signOut } from "../login/actions";
import { cancelMyReservation, changePassword, updateProfile, type ProfileState } from "./actions";

export interface MyReservation {
  id: string;
  date: string;
  time: string;
  end_time: string | null;
  guests: number;
  is_private: boolean;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  upcoming: boolean;
}

const INPUT =
  "h-12 w-full rounded-full bg-abyss px-5 text-base text-foam ring-1 ring-inset ring-foam/20 transition-shadow duration-300 ease-drift placeholder:text-mist/70 focus:outline-none focus:ring-2 focus:ring-buoy disabled:text-mist";
const CARD = "rounded-[2rem] bg-foam/5 p-1.5 ring-1 ring-foam/10";
const CORE = "h-full rounded-[calc(2rem-0.375rem)] bg-trench p-6 shadow-[inset_0_1px_1px_rgba(232,239,236,0.12)] md:p-8";
const STATUS_STYLE = {
  pending: "bg-buoy text-abyss",
  confirmed: "bg-[#4fb39a] text-abyss",
  declined: "bg-foam/15 text-foam",
  cancelled: "bg-foam/15 text-mist",
};
const INITIAL: ProfileState = { error: null, done: false };

function Button({ children, variant = "solid", confirm }: { children: string; variant?: "solid" | "ghost"; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={`label rounded-full px-6 py-3.5 transition-colors duration-500 ease-drift active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${
        variant === "solid" ? "bg-buoy text-abyss hover:bg-foam" : "text-foam ring-1 ring-inset ring-foam/25 hover:bg-foam hover:text-abyss"
      }`}
    >
      {children}
    </button>
  );
}

interface Props {
  me: SessionUser;
  reservations: MyReservation[];
  hasPassword: boolean;
}

export default function ProfileView({ me, reservations, hasPassword }: Props) {
  const { t, locale } = useLanguage();
  const copy = t.profile;
  const [details, saveDetails] = useActionState(updateProfile, INITIAL);
  const [password, savePassword] = useActionState(changePassword, INITIAL);

  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const upcoming = reservations.filter((r) => r.upcoming).reverse();
  const past = reservations.filter((r) => !r.upcoming);

  const list = (items: MyReservation[], title: string) =>
    items.length > 0 && (
      <>
        <h3 className="label mb-3 mt-8 text-mist first:mt-0">{title}</h3>
        <ul className="flex flex-col gap-3">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-abyss/60 p-5 ring-1 ring-foam/10">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`label rounded-full px-3 py-1.5 text-[10px] ${STATUS_STYLE[r.status]}`}>
                    {copy.status[r.status]}
                  </span>
                  {r.is_private && <span className="label text-[10px] text-buoy">{copy.privateEvent}</span>}
                </div>
                <p className="display mt-2 text-2xl text-foam">{formatDate(r.date)}</p>
                <p className="text-sm text-mist">
                  {copy.at(r.time, r.end_time)} · {copy.guests(r.guests)}
                </p>
              </div>
              {r.upcoming && (r.status === "pending" || r.status === "confirmed") && (
                <form action={cancelMyReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button variant="ghost" confirm={copy.cancelConfirm}>
                    {copy.cancel}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-10 md:px-8 md:py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="display wordmark text-2xl tracking-[0.14em] text-foam">
          BAR-05
        </Link>
        <div className="flex flex-wrap gap-2">
          {me.role === "owner" && (
            <a href="/admin" className="label rounded-full bg-foam px-5 py-3 text-abyss transition-colors hover:bg-buoy">
              {copy.toAdmin}
            </a>
          )}
          <form action={signOut}>
            <Button variant="ghost">{copy.signOut}</Button>
          </form>
        </div>
      </header>

      <h1 className="display mt-12 text-[clamp(2.5rem,6vw,4.5rem)] leading-none text-foam">{copy.hello(me.name)}</h1>
      <p className="mt-3 break-all text-mist">{me.email}</p>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className={`${CARD} lg:col-span-3`}>
          <div className={CORE}>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="display text-3xl text-foam">{copy.bookings}</h2>
              <Link href="/#reserve" className="label text-buoy hover:text-foam">
                {copy.bookNow} ↗
              </Link>
            </div>
            {reservations.length === 0 ? (
              <p className="text-mist">{copy.noBookings}</p>
            ) : (
              <>
                {list(upcoming, copy.upcoming)}
                {list(past, copy.past)}
              </>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className={CARD}>
            <div className={CORE}>
              <h2 className="display text-3xl text-foam">{copy.details}</h2>
              <p className="mt-2 text-sm text-mist">{copy.detailsHint}</p>
              <form action={saveDetails} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="label text-foam">{copy.name}</span>
                  <input name="name" defaultValue={me.name} required autoComplete="name" className={INPUT} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label text-foam">{copy.phone}</span>
                  <input name="phone" type="tel" defaultValue={me.phone} autoComplete="tel" className={INPUT} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label text-foam">{copy.email}</span>
                  <input value={me.email} disabled aria-describedby="email-hint" className={INPUT} />
                  <span id="email-hint" className="text-sm text-mist">
                    {copy.emailHint}
                  </span>
                </label>
                {details.error && <p role="alert" className="text-sm text-buoy">{copy.errors[details.error]}</p>}
                {details.done && <p role="status" className="text-sm text-[#4fb39a]">{copy.saved}</p>}
                <div>
                  <Button>{copy.save}</Button>
                </div>
              </form>
            </div>
          </section>

          <section className={CARD}>
            <div className={CORE}>
              <h2 className="display text-3xl text-foam">{copy.passwordTitle}</h2>
              <form action={savePassword} className="mt-6 flex flex-col gap-4">
                <input type="text" name="username" value={me.email} autoComplete="username" readOnly hidden />
                {hasPassword ? (
                  <label className="flex flex-col gap-2">
                    <span className="label text-foam">{copy.currentPassword}</span>
                    <input name="current" type="password" required autoComplete="current-password" className={INPUT} />
                  </label>
                ) : (
                  <p className="text-sm text-mist">{copy.googleOnly}</p>
                )}
                <label className="flex flex-col gap-2">
                  <span className="label text-foam">{copy.newPassword}</span>
                  <input name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
                </label>
                {password.error && <p role="alert" className="text-sm text-buoy">{copy.errors[password.error]}</p>}
                {password.done && <p role="status" className="text-sm text-[#4fb39a]">{copy.passwordChanged}</p>}
                <div>
                  <Button>{copy.changePassword}</Button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      <Link href="/" className="mt-10 inline-block text-sm text-mist transition-colors hover:text-foam">
        {copy.back}
      </Link>
    </main>
  );
}
