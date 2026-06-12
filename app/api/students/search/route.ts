import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("students")
    .select("id, full_name, slug, stage, status")
    .eq("status", "live")
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
