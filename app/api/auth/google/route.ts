import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, safeNext } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import { GOOGLE_STATE_COOKIE, isGoogleConfigured, startGoogleLogin } from "@/lib/google";
import { isLoginBlocked } from "@/lib/login-throttle";
import { ipKey } from "@/lib/security";

/*
  Sends the visitor to Google's account picker. With ?link=1 a signed-in
  account links Google to itself (the only way an owner account gets Google
  sign-in, see the callback). The state cookie binds the answer to this browser.
*/
export async function GET(request: Request) {
  const url = new URL(request.url);
  const link = url.searchParams.get("link") === "1";
  if (!isGoogleConfigured() || !hasDatabase()) return NextResponse.redirect(new URL("/login?error=google", url), 303);
  if (await isLoginBlocked("", ipKey(request.headers))) {
    return NextResponse.redirect(new URL("/login?error=tooMany", url), 303);
  }

  let linkUserId = "";
  if (link) {
    const me = await getSession();
    if (!me) return NextResponse.redirect(new URL("/login?next=%2Fprofile", url), 303);
    linkUserId = me.id;
  }

  const { url: googleUrl, state, verifier } = startGoogleLogin(url.origin);
  (await cookies()).set(
    GOOGLE_STATE_COOKIE,
    JSON.stringify({ state, verifier, next: link ? "/profile" : safeNext(url.searchParams.get("next")), link: linkUserId }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/auth/google",
    },
  );
  return NextResponse.redirect(googleUrl, 303);
}
