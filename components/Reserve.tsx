"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, CheckCircle, Phone, UserCircle } from "@phosphor-icons/react";
import Heading from "@/components/Heading";
import Reveal from "@/components/Reveal";
import { useSiteData } from "@/components/SiteData";
import { loginHref, useAccount, type Account } from "@/lib/account";
import { VENUE } from "@/lib/data";
import { useLanguage } from "@/lib/language";
import {
  MAX_MESSAGE_LENGTH,
  MAX_PRIVATE_GUESTS,
  MAX_TABLE_GUESTS,
  OCCASIONS,
  validateReservation,
  type ReservationErrors,
  type ReservationField,
  type ReservationInput,
} from "@/lib/reservation";

type Status = "idle" | "sending" | "sent" | "failed" | "signedOut";

const EMPTY: ReservationInput = {
  name: "",
  phone: "",
  date: "",
  time: "",
  guests: "2",
  isPrivate: false,
  occasion: "",
  endTime: "",
  email: "",
  message: "",
};

const INPUT =
  "h-12 w-full rounded-full bg-abyss px-5 text-base text-foam ring-1 ring-inset ring-foam/20 transition-shadow duration-300 ease-drift placeholder:text-mist/70 focus:outline-none focus:ring-2 focus:ring-buoy aria-[invalid=true]:ring-buoy";

interface FieldProps {
  id: ReservationField;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label text-foam">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-buoy">
          {error}
        </p>
      )}
    </div>
  );
}

function BookingForm({ account }: { account: Account }) {
  const start: ReservationInput = { ...EMPTY, name: account.name, phone: account.phone, email: account.email };
  const [values, setValues] = useState<ReservationInput>(start);
  const [errors, setErrors] = useState<ReservationErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const { t, locale } = useLanguage();
  const schedule = useSiteData();
  const copy = t.reserve;
  // Validation returns codes; the sentence shown depends on the current language.
  const message = (key: ReservationField) => {
    const code = errors[key];
    return code ? copy.errors[code] : undefined;
  };

  const update = (key: ReservationField, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // A whole-bar booking has no fixed table size, so the guest count starts empty.
  const togglePrivate = (isPrivate: boolean) => {
    setValues((current) => ({ ...current, isPrivate, guests: isPrivate ? "" : "2" }));
    setErrors({});
  };

  const fieldProps = (key: ReservationField) => ({
    id: key,
    name: key,
    value: values[key],
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
    className: INPUT,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateReservation(values, schedule);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("sending");
    try {
      const response = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, locale }),
      });
      // The session ran out since the page loaded.
      if (response.status === 401) {
        setStatus("signedOut");
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (result.errors) setErrors(result.errors);
        setStatus(result.errors ? "idle" : "failed");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  const reset = () => {
    setValues(start);
    setErrors({});
    setStatus("idle");
  };

  return (
    <>
      <p className="mb-6 flex items-center gap-2 text-sm text-mist">
        <UserCircle size={18} weight="light" className="text-buoy" />
        {copy.bookingAs(account.email)}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {status === "sent" ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex min-h-[420px] flex-col items-start justify-center gap-5"
            role="status"
          >
            <CheckCircle size={48} weight="light" className="text-buoy" />
            <h3 className="display text-4xl italic text-foam">{copy.sentTitle}</h3>
            <p className="max-w-[40ch] text-base leading-relaxed text-mist">
              {values.isPrivate
                ? copy.sentBodyPrivate(values.name.trim(), values.phone.trim())
                : copy.sentBody(values.name.trim(), values.phone.trim(), values.guests, values.time)}
            </p>
            <button
              type="button"
              onClick={reset}
              className="label mt-2 rounded-full px-5 py-3.5 text-foam ring-1 ring-inset ring-foam/25 transition-colors duration-500 ease-drift hover:bg-foam hover:text-abyss active:scale-[0.98]"
            >
              {copy.again}
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2"
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-3xl bg-abyss p-4 ring-1 ring-inset ring-foam/20 has-[:checked]:ring-2 has-[:checked]:ring-buoy sm:col-span-2">
              <input
                type="checkbox"
                name="isPrivate"
                checked={values.isPrivate}
                onChange={(event) => togglePrivate(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-buoy"
              />
              <span>
                <span className="block text-base text-foam">{copy.privateLabel}</span>
                <span className="mt-1 block text-sm text-mist">{copy.privateHint}</span>
              </span>
            </label>

            <Field id="name" label={copy.name} error={message("name")}>
              <input
                {...fieldProps("name")}
                type="text"
                autoComplete="name"
                placeholder={copy.namePlaceholder}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <Field id="phone" label={copy.phone} error={message("phone")}>
              <input
                {...fieldProps("phone")}
                type="tel"
                autoComplete="tel"
                placeholder={copy.phonePlaceholder}
                onChange={(event) => update("phone", event.target.value)}
              />
            </Field>
            <Field id="date" label={copy.date} error={message("date")}>
              <input
                {...fieldProps("date")}
                type="date"
                onChange={(event) => update("date", event.target.value)}
              />
            </Field>
            <Field id="time" label={copy.time} error={message("time")}>
              <input
                {...fieldProps("time")}
                type="time"
                onChange={(event) => update("time", event.target.value)}
              />
            </Field>
            {values.isPrivate ? (
              <>
                <Field id="endTime" label={copy.endTime} error={message("endTime")}>
                  <input
                    {...fieldProps("endTime")}
                    type="time"
                    onChange={(event) => update("endTime", event.target.value)}
                  />
                </Field>
                <Field id="guests" label={copy.expectedGuests} error={message("guests")}>
                  <input
                    {...fieldProps("guests")}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_PRIVATE_GUESTS}
                    onChange={(event) => update("guests", event.target.value)}
                  />
                </Field>
                <Field id="occasion" label={copy.occasion} error={message("occasion")}>
                  <select
                    {...fieldProps("occasion")}
                    onChange={(event) => update("occasion", event.target.value)}
                  >
                    <option value="">{copy.occasionPlaceholder}</option>
                    {OCCASIONS.map((occasion) => (
                      <option key={occasion} value={occasion}>
                        {copy.occasions[occasion]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="email" label={copy.email} error={message("email")}>
                  <input
                    {...fieldProps("email")}
                    type="email"
                    autoComplete="email"
                    placeholder={copy.emailPlaceholder}
                    onChange={(event) => update("email", event.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="message" label={copy.message} error={message("message")}>
                    <textarea
                      {...fieldProps("message")}
                      rows={4}
                      maxLength={MAX_MESSAGE_LENGTH}
                      placeholder={copy.messagePlaceholder}
                      onChange={(event) => update("message", event.target.value)}
                      className={`${INPUT} h-auto resize-y rounded-3xl py-3`}
                    />
                  </Field>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <Field id="guests" label={copy.guests} error={message("guests")}>
                  <select
                    {...fieldProps("guests")}
                    onChange={(event) => update("guests", event.target.value)}
                  >
                    {Array.from({ length: MAX_TABLE_GUESTS }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>
                        {copy.guestCount(count)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-4 sm:col-span-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="group inline-flex items-center justify-between gap-3 self-start whitespace-nowrap label rounded-full bg-buoy py-2 pl-6 pr-2 text-abyss transition-colors duration-500 ease-drift hover:bg-foam active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
              >
                {status === "sending" ? copy.sending : values.isPrivate ? copy.submitPrivate : copy.submit}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-abyss/15 transition-transform duration-500 ease-drift group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105">
                  <ArrowUpRight size={16} weight="light" />
                </span>
              </button>
              {status === "failed" && (
                <p role="alert" className="text-sm text-buoy">
                  {copy.failed} {VENUE.phone}.
                </p>
              )}
              {status === "signedOut" && (
                <p role="alert" className="text-sm text-buoy">
                  {copy.sessionExpired}{" "}
                  <a href={loginHref("/#reserve")} className="underline underline-offset-4">
                    {copy.loginCta}
                  </a>
                </p>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Reserve() {
  const { t } = useLanguage();
  const copy = t.reserve;
  const { account, loading } = useAccount();

  return (
    <section
      id="reserve"
      className="mx-auto grid w-full max-w-[1400px] scroll-mt-28 grid-cols-1 gap-10 px-4 py-20 md:px-10 md:py-48 lg:grid-cols-12 lg:gap-10"
    >
      <Reveal className="lg:col-span-6">
        <h2 className="display text-[clamp(2.25rem,6vw,5.5rem)] leading-[1.04] text-foam">
          <Heading parts={copy.title} />
        </h2>
        <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-mist md:text-lg">
          {copy.body}
        </p>
        <a
          href={VENUE.phoneHref}
          className="display mt-6 inline-flex min-h-11 items-center gap-3 text-3xl text-foam transition-colors duration-500 ease-drift hover:text-buoy"
        >
          <Phone size={22} weight="light" className="text-buoy" />
          {VENUE.phone}
        </a>
      </Reveal>

      <Reveal delay={0.1} className="rounded-[2rem] bg-foam/5 p-1.5 ring-1 ring-foam/10 lg:col-span-6">
        <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-trench p-6 shadow-[inset_0_1px_1px_rgba(232,239,236,0.12)] md:p-10">
          {loading ? (
            <div aria-busy="true" className="min-h-[420px]" />
          ) : account ? (
            <BookingForm key={account.id} account={account} />
          ) : (
            <div className="flex min-h-[420px] flex-col items-start justify-center gap-5">
              <UserCircle size={48} weight="light" className="text-buoy" />
              <h3 className="display text-4xl text-foam">{copy.loginTitle}</h3>
              <p className="max-w-[42ch] text-base leading-relaxed text-mist">{copy.loginBody}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href={loginHref("/#reserve")}
                  className="label rounded-full bg-buoy px-6 py-4 text-abyss transition-colors duration-500 ease-drift hover:bg-foam"
                >
                  {copy.loginCta}
                </a>
                <a
                  href={loginHref("/#reserve", "signup")}
                  className="label rounded-full px-6 py-4 text-foam ring-1 ring-inset ring-foam/25 transition-colors duration-500 ease-drift hover:bg-foam hover:text-abyss"
                >
                  {copy.signupCta}
                </a>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
