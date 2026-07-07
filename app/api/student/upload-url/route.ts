import { NextRequest, NextResponse } from "next/server";
import { requireStudentAuth } from "@/lib/student-auth";
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

/** Strip anything but [a-z0-9-] so an id can never contain path separators or `..`. */
function sanitizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** POST /api/student/upload-url — generate a storage path for a student clip upload. */
export async function POST(req: NextRequest) {
  const auth = await requireStudentAuth();
  if (auth.error) return auth.error;

  const { contentType } = (await req.json()) as { contentType?: string };

  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported type: ${contentType}` },
      { status: 400 }
    );
  }

  const studentId = sanitizeId(auth.studentId);
  if (!studentId) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const ext = extForMime(contentType);
  const ts = Date.now();
  const rand = crypto.randomUUID().slice(0, 8);
  const objectPath = `student-clips/${studentId}/${ts}-${rand}.${ext}`;

  const db = createServerClient();
  const { data } = db.storage.from("rca-notes").getPublicUrl(objectPath);

  return NextResponse.json({
    objectPath,
    publicUrl: data.publicUrl,
  });
}
