import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const studentSlug = formData.get("studentSlug") as string | null;

  if (!file || !studentSlug) {
    return NextResponse.json({ error: "file and studentSlug required" }, { status: 400 });
  }

  const db = createServerClient();

  // Ensure bucket exists (idempotent — ignores "already exists" error)
  await db.storage.createBucket("rca-notes", {
    public: false,
    allowedMimeTypes: ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"],
    fileSizeLimit: 10 * 1024 * 1024,
  });

  const ext = file.type.includes("mp4") ? "mp4" : file.type.includes("ogg") ? "ogg" : "webm";
  const path = `coach-notes/${studentSlug}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await db.storage
    .from("rca-notes")
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = db.storage.from("rca-notes").getPublicUrl(path);
  return NextResponse.json({ url: urlData.publicUrl });
}
