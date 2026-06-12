import { NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const db = createServerClient();

  // Fetch threads and students separately, join in memory to avoid TS inference issues
  const { data: threads, error: threadsError } = await db
    .from("threads")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (threadsError) return NextResponse.json({ error: threadsError.message }, { status: 500 });

  const { data: students } = await db
    .from("students")
    .select("id, full_name, slug, whatsapp_number");

  const studentMap = new Map((students ?? []).map((s) => [s.id, s]));

  const enriched = (threads ?? []).map((t) => ({
    ...t,
    student: studentMap.get(t.student_id) ?? null,
  }));

  return NextResponse.json(enriched);
}
