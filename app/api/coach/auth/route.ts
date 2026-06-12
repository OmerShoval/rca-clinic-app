import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "oa_coach";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// POST { password } → verify, set cookie
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password as string | undefined;
  const expected = process.env.COACH_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "Coach auth not configured" }, { status: 500 });
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "authenticated",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// DELETE → logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
  return res;
}
