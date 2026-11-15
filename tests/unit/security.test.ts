import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, needsRehash, safeNext, verifyPassword } from "@/lib/auth";
import { contentSecurityPolicy } from "@/lib/csp";
import { clientIp, isSameOrigin, isUuid } from "@/lib/security";

describe("safeNext (no open redirect after login)", () => {
  it.each(["/profile", "/admin/reservations?status=pending", "/#reserve"])("keeps %s", (path) => {
    expect(safeNext(path)).toBe(path);
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    " /profile",
    "profile",
    "",
    undefined,
    42,
  ])("refuses %j", (value) => {
    expect(safeNext(value)).toBe("");
  });
});

describe("passwords", () => {
  it("verifies the right password and refuses a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).toMatch(/^scrypt\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
    expect(needsRehash(stored)).toBe(false);
  });

  it("never accepts an empty or tampered hash (Google-only accounts have none)", async () => {
    expect(await verifyPassword("", "")).toBe(false);
    expect(await verifyPassword("x", "scrypt$$")).toBe(false);
    // A cost that would need gigabytes of memory is refused instead of computed.
    expect(await verifyPassword("x", `scrypt$${2 ** 24}$8$1$${"a".repeat(32)}$${"b".repeat(128)}`)).toBe(false);
  });

  it("refuses passwords longer than the limit", async () => {
    const stored = await hashPassword("short-password");
    expect(await verifyPassword("a".repeat(257), stored)).toBe(false);
  });

  it("marks hashes with the old, weaker cost for rewriting", () => {
    expect(needsRehash(`scrypt$${"a".repeat(32)}$${"b".repeat(128)}`)).toBe(true);
  });
});

describe("request checks", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("recognises UUIDs only", () => {
    expect(isUuid("1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toBe(true);
    expect(isUuid("1' or '1'='1")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it("trusts forwarded addresses only on Vercel, where the edge sets them", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5", "x-real-ip": "203.0.113.5" });
    vi.stubEnv("VERCEL", "");
    expect(clientIp(headers)).toBe("untrusted-proxy");
    vi.stubEnv("VERCEL", "1");
    expect(clientIp(headers)).toBe("203.0.113.5");
  });

  it("refuses cross-site requests that would carry the session cookie", () => {
    const at = (headers: Record<string, string>) => new Request("https://bar-05.example/api/reserve", { method: "POST", headers });
    expect(isSameOrigin(at({ origin: "https://bar-05.example", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOrigin(at({}))).toBe(true);
    expect(isSameOrigin(at({ origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(at({ "sec-fetch-site": "cross-site" }))).toBe(false);
  });
});

describe("Content Security Policy", () => {
  it("signed-in pages only run scripts with this response's nonce", () => {
    const policy = contentSecurityPolicy("abc123");
    expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });
});
