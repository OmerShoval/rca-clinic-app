import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const db = createServerClient();
  const { data, error } = await db
    .from("students")
    .select("id, full_name, slug, stage, awareness, execution, focus_skill, whatsapp_number, status, clinic_id, created_at")
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const body = await req.json();
  const { full_name, clinic_id, stage, awareness, execution, focus_skill, whatsapp_number, status } = body;

  if (!full_name || !clinic_id) {
    return NextResponse.json({ error: "full_name and clinic_id are required" }, { status: 400 });
  }

  const db = createServerClient();

  // Unique slug generation
  const baseSlug = toSlug(full_name);
  let slug = baseSlug;
  let attempt = 1;

  while (true) {
    const { data: existing } = await db
      .from("students")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const { data, error } = await db
    .from("students")
    .insert({
      full_name: full_name.trim(),
      slug,
      clinic_id: Number(clinic_id),
      stage: stage ?? 1,
      awareness: awareness ?? 1,
      execution: execution ?? 1,
      focus_skill: focus_skill ?? null,
      whatsapp_number: whatsapp_number ?? null,
      status: status ?? "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
