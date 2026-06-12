import { NextRequest, NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const { id } = await params;
  const body = await req.json();
  const { status, reply_url, reply_type } = body;

  type ThreadUpdate = {
    status?: "new" | "in_review" | "answered";
    reply_url?: string | null;
    reply_type?: "video" | "voice" | "whatsapp" | null;
    answered_at?: string | null;
  };

  const update: ThreadUpdate = {};
  if (status !== undefined) {
    update.status = status as "new" | "in_review" | "answered";
    if (status === "answered") update.answered_at = new Date().toISOString();
    else update.answered_at = null;
  }
  if (reply_url !== undefined) update.reply_url = reply_url || null;
  if (reply_type !== undefined) update.reply_type = reply_type as "video" | "voice" | "whatsapp" | null;

  const db = createServerClient();
  const { data, error } = await db
    .from("threads")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
