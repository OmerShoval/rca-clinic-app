import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const db = createServerClient();
  const { data, error } = await db
    .from("translations")
    .select("*")
    .eq("student_id", studentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const body = await req.json();
  const { student_id, environment, whats_different, try_first, on_wave_reminder, video_url, personal_note_url } = body;

  if (!student_id || !environment) {
    return NextResponse.json({ error: "student_id and environment required" }, { status: 400 });
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("translations")
    .select("id")
    .eq("student_id", student_id)
    .eq("environment", environment)
    .maybeSingle();

  const payload = {
    student_id,
    environment,
    whats_different: whats_different ?? null,
    try_first: try_first ?? null,
    on_wave_reminder: on_wave_reminder ?? null,
    video_url: video_url ?? null,
    personal_note_url: personal_note_url ?? null,
  };

  let data, error;

  if (existing) {
    ({ data, error } = await db
      .from("translations")
      .update({ whats_different: payload.whats_different, try_first: payload.try_first, on_wave_reminder: payload.on_wave_reminder, video_url: payload.video_url, personal_note_url: payload.personal_note_url })
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await db
      .from("translations")
      .insert(payload)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
