import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function requireStudentAuth(): Promise<
  { error: NextResponse; studentId: null } | { error: null; studentId: string }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get("oa_token")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), studentId: null };
  }

  const db = createServerClient();
  const { data: session } = await db
    .from("sessions")
    .select("student_id")
    .eq("device_token", token)
    .single();

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), studentId: null };
  }

  return { error: null, studentId: session.student_id };
}
