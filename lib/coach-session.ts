// ============================================================
// lib/coach-session.ts — signed, expiring coach session tokens.
//
// EDGE-SAFE BY CONSTRUCTION: Web Crypto only, no node:crypto import.
// proxy.ts runs on the Edge runtime and imports this file, so a single
// node:crypto import anywhere in this module's graph breaks the build.
//
// Cookie value format:  <expUnixMs>.<base64url(hmacSha256(expUnixMs))>
//
// Replaces the previous constant value "authenticated", which carried no
// signature, no expiry and no binding to COACH_PASSWORD — meaning anyone
// could forge coach access with a single request header.
// ============================================================

const encoder = new TextEncoder();

/** Session lifetime. Re-issued on every successful login. */
export const COACH_SESSION_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

export const COACH_COOKIE = "oa_coach";

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/** Constant-time string compare — never short-circuits on first mismatch. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Mint a signed cookie value valid for COACH_SESSION_MAX_AGE_S seconds. */
export async function signCoachSession(secret: string, now = Date.now()): Promise<string> {
  const exp = now + COACH_SESSION_MAX_AGE_S * 1000;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(String(exp)));
  return `${exp}.${toBase64Url(sig)}`;
}

/**
 * Verify a cookie value. Returns false for anything malformed, expired, or
 * signed with a different secret — so rotating COACH_SESSION_SECRET instantly
 * revokes every outstanding coach session, which the old design could not do.
 */
export async function verifyCoachSession(
  value: string | undefined | null,
  secret: string | undefined,
  now = Date.now()
): Promise<boolean> {
  if (!value || !secret) return false;

  const dot = value.indexOf(".");
  if (dot < 1) return false;

  const expRaw = value.slice(0, dot);
  const providedSig = value.slice(dot + 1);
  if (!providedSig) return false;

  // Reject non-numeric / non-integer expiries before doing any crypto work.
  if (!/^\d{1,15}$/.test(expRaw)) return false;
  const exp = Number(expRaw);
  if (!Number.isSafeInteger(exp) || exp <= now) return false;

  const key = await hmacKey(secret);
  const expected = toBase64Url(
    await crypto.subtle.sign("HMAC", key, encoder.encode(expRaw))
  );

  return timingSafeEqual(providedSig, expected);
}
