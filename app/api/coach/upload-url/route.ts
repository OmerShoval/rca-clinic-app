import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";
import {
  extForMime,
  VIDEO_MIME_TYPES,
  IMAGE_MIME_TYPES,
  AUDIO_MIME_TYPES,
} from "@/lib/video";

const ALLOWED_TYPES = new Set<string>([
  ...VIDEO_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
]);

/** Strip anything but [a-z0-9-] so a slug can never contain path separators or `..`. */
function sanitizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export async function POST(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const body = await req.json();
  const { contentType, studentSlug, kind = "audio" } = body as {
    contentType: string;
    studentSlug: string;
    kind?: string;
  };

  if (!contentType || !studentSlug) {
    return NextResponse.json(
      { error: "contentType and studentSlug required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported type: ${contentType}` },
      { status: 400 }
    );
  }

  const slug = sanitizeSlug(studentSlug);
  if (!slug) {
    return NextResponse.json({ error: "Invalid studentSlug" }, { status: 400 });
  }

  const ext = extForMime(contentType);
  const folder =
    kind === "cover"
      ? "cover-photos"
      : kind === "node"
      ? "node-media"
      : kind === "video"
      ? "coach-clips"
      : "coach-notes";

  const ts = Date.now();
  const rand = crypto.randomUUID().slice(0, 8);
  const objectPath = `${folder}/${slug}/${ts}-${rand}.${ext}`;

  const db = createServerClient();
  const { data: urlData } = db.storage.from("rca-notes").getPublicUrl(objectPath);

  return NextResponse.json({
    objectPath,
    publicUrl: urlData.publicUrl,
  });
}
