/*
  Content Security Policy, in two strengths:

  - Signed-in pages (/admin, /profile, /login) are rendered per request, so
    proxy.ts gives each response a fresh nonce and only scripts carrying it
    (Next.js adds it to its own) may run: no inline or injected script can.
  - The public pages are prerendered once at build time. A nonce cannot be
    baked into a static file, and Next.js streams its page data as small
    inline scripts, so those pages keep 'unsafe-inline' for scripts (never
    'unsafe-eval' in production). Every other source is locked to this site.

  Styles keep 'unsafe-inline' everywhere: React renders style="…" attributes
  (next/image, motion's initial states, the GSAP/Lenis scroll set-up), and
  attributes cannot carry a nonce. Style injection cannot run code.

  form-action allows Google so "Mit Google anmelden" can leave the site; the
  redirect itself is a plain link, the rest are same-origin forms.
*/

const dev = process.env.NODE_ENV === "development";

export function contentSecurityPolicy(nonce?: string) {
  const script = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    `script-src ${script}${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ].join("; ");
}
