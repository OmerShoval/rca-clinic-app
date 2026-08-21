import { NextRequest, NextResponse } from "next/server";
import {
  COACH_COOKIE,
  COACH_SESSION_MAX_AGE_S,
  signCoachSession,
} from "@/lib/coach-session";

/** Constant-time compare so the password check leaks no timing signal. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// POST { password } → verify, set signed session cookie
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password as string | undefined;
  const expected = process.env.COACH_PASSWORD;
  const secret = process.env.COACH_SESSION_SECRET;

  if (!expected || !secret) {
    return NextResponse.json(
      { error: "Coach auth not configured" },
      { status: 500 }
    );
  }

  if (!password || !timingSafeEqual(password, expected)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COACH_COOKIE,
    value: await signCoachSession(secret),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COACH_SESSION_MAX_AGE_S,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// DELETE → logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COACH_COOKIE, value: "", maxAge: 0, path: "/" });
  return res;
}
