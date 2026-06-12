import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id } = await params;
  const db = createServerClient();
  const { data, error } = await db
    .from("debrief_blocks")
    .select("*")
    .eq("debrief_id", id)
    .order("sort");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT replaces all block content for a debrief (auto-save all 5 at once)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id } = await params;
  // blocks: array of { id, title, body, felt_sense_quote, timestamp_marker, where_on_wave, why_it_happened, video_url, video_url_secondary }
  const { blocks } = await req.json() as {
    blocks: Array<{
      id: string;
      title?: string | null;
      body?: string | null;
      felt_sense_quote?: string | null;
      timestamp_marker?: string | null;
      where_on_wave?: string | null;
      why_it_happened?: string | null;
      video_url?: string | null;
      video_url_secondary?: string | null;
    }>;
  };

  if (!Array.isArray(blocks)) {
    return NextResponse.json({ error: "blocks array required" }, { status: 400 });
  }

  const db = createServerClient();

  // Verify all blocks belong to this debrief
  const { data: existing } = await db
    .from("debrief_blocks")
    .select("id")
    .eq("debrief_id", id);

  const validIds = new Set((existing ?? []).map((b) => b.id));

  const updates = blocks
    .filter((b) => validIds.has(b.id))
    .map((b) =>
      db
        .from("debrief_blocks")
        .update({
          title: b.title ?? null,
          body: b.body ?? null,
          felt_sense_quote: b.felt_sense_quote ?? null,
          timestamp_marker: b.timestamp_marker ?? null,
          where_on_wave: b.where_on_wave ?? null,
          why_it_happened: b.why_it_happened ?? null,
          video_url: b.video_url ?? null,
          video_url_secondary: b.video_url_secondary ?? null,
        })
        .eq("id", b.id)
    );

  await Promise.all(updates);

  return NextResponse.json({ ok: true });
}
