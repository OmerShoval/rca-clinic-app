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
    .from("threads")
    .select("id, step_ref, title, status")
    .eq("student_id", studentId)
    .not("step_ref", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
