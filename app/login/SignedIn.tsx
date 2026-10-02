"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";
import { signOut } from "./actions";

export default function SignedIn({ email, isOwner }: { email: string; isOwner: boolean }) {
  const { t } = useLanguage();
  const copy = t.login;

  return (
    <>
      <p className="mt-6 text-sm text-mist">{copy.signedInAs}</p>
      <p className="display mt-1 break-all text-3xl text-foam">{email}</p>
      {!isOwner && <p className="mt-4 text-sm leading-relaxed text-mist">{copy.noAccess}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        {isOwner && (
          <a
            href="/admin"
            className="label rounded-full bg-buoy px-6 py-4 text-abyss transition-colors duration-500 ease-drift hover:bg-foam"
          >
            {copy.toAdmin}
          </a>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="label rounded-full px-6 py-4 text-foam ring-1 ring-inset ring-foam/25 transition-colors duration-500 ease-drift hover:bg-foam hover:text-abyss"
          >
            {copy.signOut}
          </button>
        </form>
      </div>
      <Link href="/" className="mt-8 inline-block text-sm text-mist transition-colors hover:text-foam">
        {copy.back}
      </Link>
    </>
  );
}
