import { NextRequest, NextResponse } from "next/server";
import { requireStudentAuth } from "@/lib/student-auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/habit-logs?weeks=10 — returns the student's habit logs
export async function GET(req: NextRequest) {
  const auth = await requireStudentAuth();
  if (auth.error) return auth.error;

  const weeks = parseInt(req.nextUrl.searchParams.get("weeks") ?? "10", 10);
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceIso = since.toISOString().split("T")[0];

  const db = createServerClient();
  const { data, error } = await db
    .from("habit_logs")
    .select("log_date, completed_habits, notes")
    .eq("student_id", auth.studentId)
    .gte("log_date", sinceIso)
    .order("log_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/habit-logs — upsert today's habit log
export async function POST(req: NextRequest) {
  const auth = await requireStudentAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { log_date, completed_habits, notes } = body;

  if (!log_date || !Array.isArray(completed_habits)) {
    return NextResponse.json({ error: "log_date and completed_habits[] required" }, { status: 400 });
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("habit_logs")
    .upsert(
      { student_id: auth.studentId, log_date, completed_habits, notes: notes ?? null },
      { onConflict: "student_id,log_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
}
