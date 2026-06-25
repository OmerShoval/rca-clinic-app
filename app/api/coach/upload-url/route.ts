import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

const MIME_TO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

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

  const ext = MIME_TO_EXT[contentType] ?? "bin";
  const folder =
    kind === "cover"
      ? "cover-photos"
      : kind === "node"
      ? "node-media"
      : kind === "video"
      ? "coach-clips"
      : "coach-notes";

  const objectPath = `${folder}/${studentSlug}/${Date.now()}.${ext}`;

  const db = createServerClient();
  const { data: urlData } = db.storage.from("rca-notes").getPublicUrl(objectPath);

  return NextResponse.json({
    objectPath,
    publicUrl: urlData.publicUrl,
  });
}
