import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id: studentId } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .schema("rca")
    .from("student_videos")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id: studentId } = await params;
  const body = await req.json();
  const { video_url, label, day_number, kind, debrief_id } = body as {
    video_url: string;
    label?: string;
    day_number?: number | null;
    kind?: string;
    debrief_id?: string | null;
  };

  if (!video_url) {
    return NextResponse.json({ error: "video_url required" }, { status: 400 });
  }

  const db = createServerClient();

  // Prevent duplicate entries for the same URL + student
  const { data: existing } = await db
    .schema("rca")
    .from("student_videos")
    .select("id")
    .eq("student_id", studentId)
    .eq("video_url", video_url)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(existing);
  }

  const { data, error } = await db
    .schema("rca")
    .from("student_videos")
    .insert({
      student_id: studentId,
      video_url,
      label: label ?? "",
      day_number: day_number ?? null,
      kind: (kind ?? "session") as "session" | "node" | "reference",
      debrief_id: debrief_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
