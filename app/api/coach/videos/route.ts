import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";
import type { LibraryVideo, StudentVideo } from "@/lib/database.types";

const BUCKET = "rca-notes";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Extract storage object path from a Supabase public rca-notes URL. */
function extractSupabasePath(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/storage\/v1\/object\/public\/rca-notes\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort deletion of the underlying asset for an app-owned video.
 * Never touches external providers (youtube/vimeo/drive/link). Failures are
 * swallowed so they don't block the DB row deletion.
 */
async function deleteAsset(
  row: Pick<StudentVideo, "provider" | "stream_uid" | "video_url">,
  db: ReturnType<typeof createServerClient>,
): Promise<void> {
  try {
    // ── Cloudflare Stream ─────────────────────────────────────────────────────
    if (row.provider === "cloudflare" && row.stream_uid) {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const token = process.env.CLOUDFLARE_STREAM_TOKEN;
      if (accountId && token) {
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${row.stream_uid}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => {});
      }
      return;
    }

    // ── Supabase Storage (rca-notes) ──────────────────────────────────────────
    if (row.video_url && SUPABASE_URL && row.video_url.startsWith(SUPABASE_URL)) {
      const path = extractSupabasePath(row.video_url);
      if (path) {
        await db.storage.from(BUCKET).remove([path]);
      }
    }
  } catch (err) {
    console.error("[coach/videos] asset deletion failed (continuing):", err);
  }
}

/**
 * GET /api/coach/videos — global cross-student video library.
 *
 * Query params (all optional):
 *   q            ilike on label
 *   student      student_id
 *   kind         VideoKind
 *   provider     VideoProvider
 *   source_type  VideoSourceType
 *   tag          matches if present in tags[]
 *   day          day_number
 *   is_best      "true"
 *   limit        default 200
 *   offset       default 0
 *   facets       "1" → return distinct filter facets instead of rows
 */
export async function GET(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const db = createServerClient();

  // ── Facets mode ─────────────────────────────────────────────────────────────
  if (searchParams.get("facets") === "1") {
    const { data: rows, error } = await db
      .schema("rca")
      .from("student_videos")
      .select("provider, source_type, student_id, tags");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const providers = new Set<string>();
    const sourceTypes = new Set<string>();
    const studentIds = new Set<string>();
    const tags = new Set<string>();
    for (const r of rows ?? []) {
      if (r.provider) providers.add(r.provider);
      if (r.source_type) sourceTypes.add(r.source_type);
      if (r.student_id) studentIds.add(r.student_id);
      for (const t of r.tags ?? []) tags.add(t);
    }

    // Resolve student display info for the facet list
    const ids = [...studentIds];
    const { data: students } = ids.length
      ? await db.schema("rca").from("students").select("id, full_name, slug").in("id", ids)
      : { data: [] as { id: string; full_name: string; slug: string }[] };

    return NextResponse.json({
      providers: [...providers].sort(),
      source_types: [...sourceTypes].sort(),
      tags: [...tags].sort(),
      students: (students ?? []).map((s) => ({
        id: s.id,
        full_name: s.full_name,
        slug: s.slug,
      })),
    });
  }

  // ── Rows mode ─────────────────────────────────────────────────────────────
  const q = searchParams.get("q");
  const student = searchParams.get("student");
  const kind = searchParams.get("kind");
  const provider = searchParams.get("provider");
  const sourceType = searchParams.get("source_type");
  const tag = searchParams.get("tag");
  const day = searchParams.get("day");
  const isBest = searchParams.get("is_best");
  const limit = Number(searchParams.get("limit") ?? "200") || 200;
  const offset = Number(searchParams.get("offset") ?? "0") || 0;

  let query = db.schema("rca").from("student_videos").select("*");

  if (q) query = query.ilike("label", `%${q}%`);
  if (student) query = query.eq("student_id", student);
  if (kind) query = query.eq("kind", kind as StudentVideo["kind"]);
  if (provider) query = query.eq("provider", provider as NonNullable<StudentVideo["provider"]>);
  if (sourceType) query = query.eq("source_type", sourceType as NonNullable<StudentVideo["source_type"]>);
  if (tag) query = query.contains("tags", [tag]);
  if (day) query = query.eq("day_number", Number(day));
  if (isBest === "true") query = query.eq("is_best", true);

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: videos, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (videos ?? []) as StudentVideo[];

  // ── Merge student name + slug in a second query ─────────────────────────────
  const studentIds = [...new Set(rows.map((v) => v.student_id))];
  const studentMap = new Map<string, { full_name: string; slug: string }>();
  if (studentIds.length) {
    const { data: students } = await db
      .schema("rca")
      .from("students")
      .select("id, full_name, slug")
      .in("id", studentIds);
    for (const s of students ?? []) {
      studentMap.set(s.id, { full_name: s.full_name, slug: s.slug });
    }
  }

  const result: LibraryVideo[] = rows.map((v) => {
    const s = studentMap.get(v.student_id);
    return {
      ...v,
      student_name: s?.full_name ?? null,
      student_slug: s?.slug ?? null,
    };
  });

  return NextResponse.json(result);
}

/**
 * DELETE /api/coach/videos?id=<uuid>  (or JSON body { id })
 *
 * Removes the library row, then best-effort deletes the underlying asset when
 * app-owned (Cloudflare Stream or Supabase rca-notes storage). External
 * providers are left untouched. Asset failures never fail the row deletion.
 */
export async function DELETE(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  let id = searchParams.get("id") ?? undefined;
  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = (body as { id?: string }).id;
  }
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = createServerClient();

  const { data: row, error: fetchError } = await db
    .schema("rca")
    .from("student_videos")
    .select("id, provider, stream_uid, video_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error: delError } = await db
    .schema("rca")
    .from("student_videos")
    .delete()
    .eq("id", id);

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  // Best-effort: remove the underlying asset if we own it.
  await deleteAsset(row, db);

  return NextResponse.json({ ok: true });
}
