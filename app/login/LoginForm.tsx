"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useLanguage } from "@/lib/language";
import { authenticate, type LoginState } from "./actions";

const INPUT =
  "h-12 w-full rounded-full bg-abyss px-5 text-base text-foam ring-1 ring-inset ring-foam/20 transition-shadow duration-300 ease-drift placeholder:text-mist/70 focus:outline-none focus:ring-2 focus:ring-buoy";

const INITIAL: LoginState = { error: null, email: "" };

export default function LoginForm() {
  const { t } = useLanguage();
  const copy = t.login;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState(authenticate, INITIAL);

  return (
    <>
      <h1 className="display mt-6 text-4xl text-foam">{mode === "signin" ? copy.title : copy.titleSignup}</h1>
      <p className="mt-3 text-sm leading-relaxed text-mist">{copy.subtitle}</p>

      <div role="tablist" className="mt-8 grid grid-cols-2 gap-2 rounded-full bg-abyss p-1 ring-1 ring-foam/10">
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`label rounded-full py-3 transition-colors duration-500 ease-drift ${
              mode === value ? "bg-foam text-abyss" : "text-foam/70 hover:text-foam"
            }`}
          >
            {value === "signin" ? copy.tabSignIn : copy.tabSignUp}
          </button>
        ))}
      </div>

      <form action={action} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="mode" value={mode} />
        {mode === "signup" && (
          <label className="flex flex-col gap-2">
            <span className="label text-foam">{copy.name}</span>
            <input name="name" autoComplete="name" className={INPUT} />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="label text-foam">{copy.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            defaultValue={state.email}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label text-foam">{copy.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={INPUT}
          />
          {mode === "signup" && <span className="text-sm text-mist">{copy.passwordHint}</span>}
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-buoy">
            {copy.errors[state.error]}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="label mt-2 rounded-full bg-buoy py-4 text-abyss transition-colors duration-500 ease-drift hover:bg-foam active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? copy.loading : mode === "signin" ? copy.submit : copy.submitSignup}
        </button>
      </form>

      <Link href="/" className="mt-8 inline-block text-sm text-mist transition-colors hover:text-foam">
        {copy.back}
      </Link>
    </>
  );
}
