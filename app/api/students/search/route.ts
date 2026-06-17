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
    .select("id, full_name, slug, status, pin_hash")
    .eq("status", "live")
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Strip pin_hash, expose only boolean
  const safe = (data ?? []).map(({ pin_hash, ...rest }) => ({ ...rest, has_pin: !!pin_hash }));
  return NextResponse.json(safe);
}
