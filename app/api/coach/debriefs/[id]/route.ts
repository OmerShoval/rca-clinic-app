import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id } = await params;
  const body = await req.json();
  const {
    wave_label, day_number, status, tag, cover_color_index, cover_image_url,
    session_video_url,
    summary_went_well, summary_learned, summary_coach_view, summary_felt, summary_grateful,
  } = body;

  const db = createServerClient();

  type DebriefUpdate = {
    wave_label?: string;
    day_number?: number | null;
    status?: "draft" | "published";
    published_at?: string | null;
    tag?: string | null;
    cover_color_index?: number | null;
    cover_image_url?: string | null;
    session_video_url?: string | null;
    summary_went_well?: string | null;
    summary_learned?: string | null;
    summary_coach_view?: string | null;
    summary_felt?: string | null;
    summary_grateful?: string | null;
  };

  const update: DebriefUpdate = {};
  if (wave_label !== undefined) update.wave_label = wave_label;
  if (day_number !== undefined) update.day_number = day_number;
  if (status !== undefined) {
    update.status = status as "draft" | "published";
    update.published_at = status === "published" ? new Date().toISOString() : null;
  }
  if (tag !== undefined) update.tag = tag;
  if (cover_color_index !== undefined) update.cover_color_index = cover_color_index;
  if (cover_image_url !== undefined) update.cover_image_url = cover_image_url;
  if (session_video_url !== undefined) update.session_video_url = session_video_url;
  if (summary_went_well !== undefined) update.summary_went_well = summary_went_well;
  if (summary_learned !== undefined) update.summary_learned = summary_learned;
  if (summary_coach_view !== undefined) update.summary_coach_view = summary_coach_view;
  if (summary_felt !== undefined) update.summary_felt = summary_felt;
  if (summary_grateful !== undefined) update.summary_grateful = summary_grateful;

  const { data, error } = await db
    .from("debriefs")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id } = await params;
  const db = createServerClient();

  // Blocks cascade-delete via FK if set, otherwise delete manually
  await db.from("debrief_blocks").delete().eq("debrief_id", id);
  const { error } = await db.from("debriefs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
