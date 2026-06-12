import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const COOKIE_NAME = "oa_token";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /s/* routes
  if (!pathname.startsWith("/s/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

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
    res.cookies.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
    return res;
  }

  const ownSlug = (session.students as unknown as { slug: string } | null)?.slug;

  if (!ownSlug) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Extract the slug from the URL: /s/[slug]/anything
  const urlSlug = pathname.split("/")[2];

  // If a student tries to visit another student's slug, redirect to their own
  if (urlSlug && urlSlug !== ownSlug) {
    const redirectPath = pathname.replace(`/s/${urlSlug}`, `/s/${ownSlug}`);
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*"],
};
