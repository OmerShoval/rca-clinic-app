import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/students/search?q=…  — login typeahead.
 *
 * Deliberately still public: this is the first step of student login, so it
 * cannot require a session. What it must NOT be is a roster-dump oracle.
 *
 * Hardened against the two abuses the audit found:
 *  1. `q=%%` (or any ILIKE wildcard) previously matched every live student in
 *     one request. Wildcards are now stripped, so `q` can only ever be a
 *     literal prefix.
 *  2. Matching moved from "contains" to "starts with", so a caller must
 *     already know how a name begins rather than harvesting on a substring.
 *
 * `has_pin` stays in the response because the login UI needs it, but it is no
 * longer a map of unprotected accounts: POST /api/auth/session now refuses to
 * mint a session for any student without a PIN.
 *
 * NOTE: students from completed clinics stay searchable on purpose — athletes
 * keep year-round access to their own vault after a clinic ends.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  // Strip ILIKE metacharacters and the escape character itself.
  const q = raw.replace(/[%_\\]/g, "");

  if (q.length < 2 || q.length > 40) {
    return NextResponse.json([]);
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("students")
    .select("id, full_name, slug, pin_hash")
    .eq("status", "live")
    .ilike("full_name", `${q}%`)
    .order("full_name")
    .limit(8);

  if (error) {
    console.error("student search failed:", error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const safe = (data ?? []).map(({ pin_hash, ...rest }) => ({
    ...rest,
    has_pin: !!pin_hash,
  }));
  return NextResponse.json(safe);
}
