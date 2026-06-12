import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const COOKIE_NAME = "oa_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function cookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

// POST { slug } → create session, set cookie, return { studentId, slug }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = body?.slug as string | undefined;

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const db = createServerClient();

  const { data: student, error: studentErr } = await db
    .from("students")
    .select("id, slug")
    .eq("slug", slug)
    .eq("status", "live")
    .single();

  if (studentErr || !student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Upsert a session row — one device token per student (latest wins)
  const { data: session, error: sessionErr } = await db
    .from("sessions")
    .insert({ student_id: student.id })
    .select("device_token")
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }

  const res = NextResponse.json({ studentId: student.id, slug: student.slug });
  res.cookies.set(cookieOptions(session.device_token));
  return res;
}

// GET → validate cookie, return { studentId, slug } or 401
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const db = createServerClient();

  const { data: session, error } = await db
    .from("sessions")
    .select("student_id, students(slug)")
    .eq("device_token", token)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const studentRow = session.students as unknown as { slug: string } | null;

  return NextResponse.json({
    studentId: session.student_id,
    slug: studentRow?.slug ?? null,
  });
}

// DELETE → clear cookie (logout)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
  return res;
}
