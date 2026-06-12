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
  const { wave_label, day_number, status } = body;

  const db = createServerClient();

  type DebriefUpdate = {
    wave_label?: string;
    day_number?: number | null;
    status?: "draft" | "published";
    published_at?: string | null;
  };

  const update: DebriefUpdate = {};
  if (wave_label !== undefined) update.wave_label = wave_label;
  if (day_number !== undefined) update.day_number = day_number;
  if (status !== undefined) {
    update.status = status as "draft" | "published";
    update.published_at = status === "published" ? new Date().toISOString() : null;
  }

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
