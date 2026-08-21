import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { COACH_COOKIE, verifyCoachSession } from "@/lib/coach-session";

const STUDENT_COOKIE = "oa_token";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Coach routes: guard /coach/dashboard and deeper, allow /coach (login page)
  if (pathname.startsWith("/coach/") && pathname !== "/coach/") {
    const coachAuth = req.cookies.get(COACH_COOKIE)?.value;
    // Web Crypto verify — this file runs on the Edge runtime.
    const ok = await verifyCoachSession(coachAuth, process.env.COACH_SESSION_SECRET);
    if (!ok) {
      return NextResponse.redirect(new URL("/coach", req.url));
    }
    return NextResponse.next();
  }

  // ── Student routes: guard /s/*
  if (!pathname.startsWith("/s/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(STUDENT_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const db = createServerClient();
  const { data: session } = await db
    .from("sessions")
    .select("student_id, students(slug)")
    .eq("device_token", token)
    .single();

  if (!session) {
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set({ name: STUDENT_COOKIE, value: "", maxAge: 0, path: "/" });
    return res;
  }

  const ownSlug = (session.students as unknown as { slug: string } | null)?.slug;

  if (!ownSlug) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If a student tries to visit another student's slug, redirect to their own
  const urlSlug = pathname.split("/")[2];
  if (urlSlug && urlSlug !== ownSlug) {
    const redirectPath = pathname.replace(`/s/${urlSlug}`, `/s/${ownSlug}`);
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*", "/coach/:path*"],
};
