import { NextRequest, NextResponse } from "next/server";
import { requireStudentAuth } from "@/lib/student-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireStudentAuth();
  if (auth.error) return auth.error;

  const db = createServerClient();
  const { data, error } = await db
    .from("threads")
    .select("*")
    .eq("student_id", auth.studentId)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireStudentAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { question_text, clip_url, title, step_ref } = body;

  if (!question_text?.trim()) {
    return NextResponse.json({ error: "question_text is required" }, { status: 400 });
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("threads")
    .insert({
      student_id: auth.studentId,
      question_text: question_text.trim(),
      clip_url: clip_url?.trim() || null,
      title: title?.trim() || null,
      status: "new",
      step_ref: step_ref?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
