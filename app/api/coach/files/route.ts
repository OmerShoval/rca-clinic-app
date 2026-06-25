import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

const BUCKET = "rca-notes";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Extract storage object path from a Supabase public URL. */
function extractSupabasePath(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/storage\/v1\/object\/public\/rca-notes\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Extract the CF Stream UID from an iframe.videodelivery.net URL. */
function extractCFStreamUid(url: string): string | null {
  const m = url.match(/videodelivery\.net\/([a-f0-9]{32,})/);
  return m ? m[1] : null;
}

/**
 * DELETE /api/coach/files
 *
 * Deletes a file from Supabase Storage OR Cloudflare Stream when the coach
 * replaces a video. Silently no-ops for external URLs (YouTube, Vimeo, etc.).
 */
export async function DELETE(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { url } = (await req.json()) as { url?: string };
  if (!url) return NextResponse.json({ ok: true });

  // ── Cloudflare Stream deletion ──────────────────────────────────────────────
  const cfUid = extractCFStreamUid(url);
  if (cfUid) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_STREAM_TOKEN;
    if (accountId && token) {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cfUid}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      ).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  // ── Supabase Storage deletion ───────────────────────────────────────────────
  if (!url.startsWith(SUPABASE_URL)) {
    // External URL (YouTube, Vimeo, Drive…) — nothing to delete on our side.
    return NextResponse.json({ ok: true });
  }

  const path = extractSupabasePath(url);
  if (!path) {
    return NextResponse.json({ error: "Could not parse storage path" }, { status: 400 });
  }

  const db = createServerClient();
  const { error } = await db.storage.from(BUCKET).remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
