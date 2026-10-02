import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";
import SignedIn from "./SignedIn";

export const metadata: Metadata = {
  title: "Anmelden | Bar-05",
  robots: { index: false },
};

/* One login page for everyone, as on the Atlantic site. The account's role decides where it leads. */
export default async function LoginPage() {
  const session = await getSession();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[2rem] bg-foam/5 p-1.5 ring-1 ring-foam/10">
        <div className="rounded-[calc(2rem-0.375rem)] bg-trench p-7 shadow-[inset_0_1px_1px_rgba(232,239,236,0.12)] md:p-10">
          <p className="display wordmark text-2xl tracking-[0.14em] text-foam">BAR-05</p>
          {session ? <SignedIn email={session.email} isOwner={session.role === "owner"} /> : <LoginForm />}
        </div>
      </div>
    </main>
  );
}
