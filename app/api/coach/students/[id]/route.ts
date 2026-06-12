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
  const { full_name, clinic_id, stage, awareness, execution, focus_skill, whatsapp_number, status } = body;

  const db = createServerClient();

  type StudentUpdate = {
    full_name?: string;
    clinic_id?: number;
    stage?: number;
    awareness?: number;
    execution?: number;
    focus_skill?: string | null;
    whatsapp_number?: string | null;
    status?: "draft" | "live";
  };

  const update: StudentUpdate = {};
  if (full_name !== undefined) update.full_name = full_name;
  if (clinic_id !== undefined) update.clinic_id = Number(clinic_id);
  if (stage !== undefined) update.stage = Number(stage);
  if (awareness !== undefined) update.awareness = Number(awareness);
  if (execution !== undefined) update.execution = Number(execution);
  if (focus_skill !== undefined) update.focus_skill = focus_skill;
  if (whatsapp_number !== undefined) update.whatsapp_number = whatsapp_number;
  if (status !== undefined) update.status = status as "draft" | "live";

  const { data, error } = await db
    .from("students")
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

  const { error } = await db.from("students").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
