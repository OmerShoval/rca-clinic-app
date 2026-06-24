import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

const AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const IMAGE_TYPES = ["image/gif", "image/jpeg", "image/png", "image/webp", "image/heic"];
const ALL_TYPES = [...AUDIO_TYPES, ...VIDEO_TYPES, ...IMAGE_TYPES];

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
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
  return map[mimeType] ?? "bin";
}

export async function POST(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const studentSlug = formData.get("studentSlug") as string | null;
  const kind = (formData.get("kind") as string | null) ?? "audio"; // "audio" | "video"

  if (!file || !studentSlug) {
    return NextResponse.json({ error: "file and studentSlug required" }, { status: 400 });
  }

  if (!ALL_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  const db = createServerClient();

  const bucket = "rca-notes";

  // Ensure bucket exists with updated config (idempotent)
  await db.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ALL_TYPES,
    fileSizeLimit: 100 * 1024 * 1024, // 100 MB
  });

  const ext = getExtension(file.type);
  const folder = kind === "cover" ? "cover-photos" : kind === "node" ? "node-media" : kind === "video" ? "coach-clips" : "coach-notes";
  const path = `${folder}/${studentSlug}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await db.storage
    .from(bucket)
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = db.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: urlData.publicUrl });
}
