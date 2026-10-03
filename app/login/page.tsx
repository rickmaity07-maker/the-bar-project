import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Anmelden | Bar-05",
  robots: { index: false },
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/*
  One login page for everyone, as on the Atlantic site. The account's role
  decides where it leads: owners to the admin portal, guests to their profile.
*/
export default async function LoginPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const session = await getSession();
  if (session) redirect(next || (session.role === "owner" ? "/admin" : "/profile"));

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[2rem] bg-foam/5 p-1.5 ring-1 ring-foam/10">
        <div className="rounded-[calc(2rem-0.375rem)] bg-trench p-7 shadow-[inset_0_1px_1px_rgba(232,239,236,0.12)] md:p-10">
          <p className="display wordmark text-2xl tracking-[0.14em] text-foam">BAR-05</p>
          <LoginForm
            next={next}
            initialMode={params.mode === "signup" ? "signup" : "signin"}
            google={isGoogleConfigured()}
            googleFailed={params.error === "google"}
          />
        </div>
      </div>
    </main>
  );
}
