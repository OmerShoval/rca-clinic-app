import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COACH_COOKIE, verifyCoachSession } from "@/lib/coach-session";

/**
 * Guard for every coach API route.
 *
 * Signature is deliberately unchanged — all 19 calling routes still do:
 *   const deny = await requireCoachAuth();
 *   if (deny) return deny;
 *
 * What changed is the check underneath: the cookie is now a signed, expiring
 * token rather than the constant string "authenticated", which anyone could
 * forge with a single request header.
 */
export async function requireCoachAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COACH_COOKIE)?.value;

  const ok = await verifyCoachSession(value, process.env.COACH_SESSION_SECRET);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Server-component guard. Pages cannot return a 401 response, so they ask this
 * and redirect themselves.
 *
 * Exists because app/coach/dashboard/page.tsx and app/coach/library/page.tsx
 * each carried their own inline `cookie !== "authenticated"` check — a second
 * copy of the auth rule that the API guard did not cover.
 */
export async function hasCoachSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyCoachSession(
    cookieStore.get(COACH_COOKIE)?.value,
    process.env.COACH_SESSION_SECRET,
  );
}
