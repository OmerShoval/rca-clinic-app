import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type VideoInsert = Database["rca"]["Tables"]["student_videos"]["Insert"];
type VideoUpdate = Database["rca"]["Tables"]["student_videos"]["Update"];

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
  const body = (await req.json()) as {
    video_url?: string;
    label?: string;
    day_number?: number | null;
    kind?: VideoInsert["kind"];
    debrief_id?: string | null;
    provider?: VideoInsert["provider"];
    stream_uid?: string | null;
    poster_url?: string | null;
    duration_s?: number | null;
    size_bytes?: number | null;
    mime_type?: string | null;
    original_filename?: string | null;
    tags?: string[];
    source_type?: VideoInsert["source_type"];
    source_id?: string | null;
    checksum?: string | null;
    status?: VideoInsert["status"];
  };

  const { video_url, checksum } = body;

  if (!video_url) {
    return NextResponse.json({ error: "video_url required" }, { status: 400 });
  }

  const db = createServerClient();

  // ── Dedup: prefer checksum match, else fall back to URL match ────────────────
  let existingQuery = db
    .schema("rca")
    .from("student_videos")
    .select("*")
    .eq("student_id", studentId);

  existingQuery = checksum
    ? existingQuery.eq("checksum", checksum)
    : existingQuery.eq("video_url", video_url);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    return NextResponse.json(existing);
  }

  // ── Build insert, omitting undefined so DB defaults apply ────────────────────
  const insert: VideoInsert = { student_id: studentId, video_url };
  const assign = <K extends keyof VideoInsert>(key: K, val: VideoInsert[K] | undefined) => {
    if (val !== undefined) insert[key] = val;
  };
  assign("label", body.label);
  assign("day_number", body.day_number);
  assign("kind", body.kind);
  assign("debrief_id", body.debrief_id);
  assign("provider", body.provider);
  assign("stream_uid", body.stream_uid);
  assign("poster_url", body.poster_url);
  assign("duration_s", body.duration_s);
  assign("size_bytes", body.size_bytes);
  assign("mime_type", body.mime_type);
  assign("original_filename", body.original_filename);
  assign("tags", body.tags);
  assign("source_type", body.source_type);
  assign("source_id", body.source_id);
  assign("checksum", body.checksum);
  assign("status", body.status);

  const { data, error } = await db
    .schema("rca")
    .from("student_videos")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id: studentId } = await params;
  const body = (await req.json()) as {
    id?: string;
    label?: string;
    tags?: string[];
    kind?: VideoUpdate["kind"];
    day_number?: number | null;
    movement_id?: string | null;
    wave_type?: string | null;
    is_best?: boolean;
    source_type?: VideoUpdate["source_type"];
  };

  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const update: VideoUpdate = {};
  const assign = <K extends keyof VideoUpdate>(key: K, val: VideoUpdate[K] | undefined) => {
    if (val !== undefined) update[key] = val;
  };
  assign("label", body.label);
  assign("tags", body.tags);
  assign("kind", body.kind);
  assign("day_number", body.day_number);
  assign("movement_id", body.movement_id);
  assign("wave_type", body.wave_type);
  assign("is_best", body.is_best);
  assign("source_type", body.source_type);

  const db = createServerClient();
  const { data, error } = await db
    .schema("rca")
    .from("student_videos")
    .update(update)
    .eq("id", id)
    .eq("student_id", studentId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
