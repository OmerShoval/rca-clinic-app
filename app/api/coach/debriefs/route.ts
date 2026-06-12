import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

const BLOCK_TYPES = ["mistake", "correction", "improvement", "goal", "next_step"] as const;

export async function GET(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const db = createServerClient();
  const { data, error } = await db
    .from("debriefs")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const body = await req.json();
  const { student_id, wave_label, day_number } = body;

  if (!student_id || !wave_label) {
    return NextResponse.json({ error: "student_id and wave_label are required" }, { status: 400 });
  }

  const db = createServerClient();

  const { data: debrief, error: debriefError } = await db
    .from("debriefs")
    .insert({ student_id, wave_label: wave_label.trim(), day_number: day_number ?? null, status: "draft" })
    .select()
    .single();

  if (debriefError) return NextResponse.json({ error: debriefError.message }, { status: 500 });

  // Create all 5 blocks immediately
  const blocks = BLOCK_TYPES.map((type, i) => ({
    debrief_id: debrief.id,
    type,
    sort: i + 1,
  }));

  const { error: blocksError } = await db.from("debrief_blocks").insert(blocks);
  if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 });

  return NextResponse.json(debrief, { status: 201 });
}
