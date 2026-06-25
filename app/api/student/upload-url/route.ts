import { NextRequest, NextResponse } from "next/server";
import { requireStudentAuth } from "@/lib/student-auth";
import { createServerClient } from "@/lib/supabase";

const MIME_TO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "image/gif": "gif",
};

const ALLOWED_TYPES = new Set(Object.keys(MIME_TO_EXT));

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

  const ext = MIME_TO_EXT[contentType];
  const objectPath = `student-clips/${auth.studentId}/${Date.now()}.${ext}`;

  const db = createServerClient();
  const { data } = db.storage.from("rca-notes").getPublicUrl(objectPath);

  return NextResponse.json({
    objectPath,
    publicUrl: data.publicUrl,
  });
}
