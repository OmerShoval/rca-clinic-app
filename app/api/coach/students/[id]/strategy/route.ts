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
    .from("students")
    .select("build_strategy")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const strategy = data?.build_strategy as { nodes?: unknown[]; edges?: unknown[] } | null;
  return NextResponse.json({ nodes: strategy?.nodes ?? [], edges: strategy?.edges ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id } = await params;
  const { nodes, edges } = await req.json();

  const db = createServerClient();
  const { data, error } = await db
    .from("students")
    .update({ build_strategy: { nodes: nodes ?? [], edges: edges ?? [] } })
    .eq("id", id)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
