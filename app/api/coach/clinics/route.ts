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
  const { name, number, location } = body;

  if (!name?.trim() || !number) {
    return NextResponse.json({ error: "name and number are required" }, { status: 400 });
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("clinics")
    .insert({
      name: name.trim(),
      number: Number(number),
      location: location?.trim() || null,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
