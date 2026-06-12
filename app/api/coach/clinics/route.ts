import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const db = createServerClient();
  const { data, error } = await db
    .from("clinics")
    .select("*")
    .order("number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const body = await req.json();
  const { name, location } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = createServerClient();

  // Auto-assign next number server-side — avoids stale client state / UNIQUE collisions
  const { data: maxRow } = await db
    .from("clinics")
    .select("number")
    .order("number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (maxRow?.number ?? 0) + 1;

  const { data, error } = await db
    .from("clinics")
    .insert({
      name: name.trim(),
      number: nextNumber,
      location: location?.trim() || null,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
