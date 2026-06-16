import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { DebriefDetailClient } from "@/components/student/debrief-detail-client";

interface Props {
  params: Promise<{ slug: string; debriefId: string }>;
}

export default async function DebriefDetailPage({ params }: Props) {
  const { slug, debriefId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("oa_token")?.value;
  if (!token) redirect("/");

  const db = createServerClient();

  const { data: session } = await db
    .from("sessions")
    .select("student_id")
    .eq("device_token", token)
    .single();
  if (!session) redirect("/");

  const { data: student } = await db
    .from("students")
    .select("id, full_name, slug")
    .eq("id", session.student_id)
    .single();
  if (!student || student.slug !== slug) redirect("/");

  const { data: debrief } = await db
    .from("debriefs")
    .select("id, wave_label, day_number, published_at, status, student_id")
    .eq("id", debriefId)
    .eq("student_id", student.id)
    .eq("status", "published")
    .single();

  if (!debrief) notFound();

  // Determine palette index: position of this debrief in the student's published list (newest first)
  const { data: allDebriefs } = await db
    .from("debriefs")
    .select("id")
    .eq("student_id", student.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const paletteIndex = Math.max(
    0,
    (allDebriefs ?? []).findIndex((d) => d.id === debriefId)
  );

  const { data: rawBlocks } = await db
    .from("debrief_blocks")
    .select("*")
    .eq("debrief_id", debrief.id)
    .order("sort");

  return (
    <DebriefDetailClient
      slug={slug}
      debrief={{
        id: debrief.id,
        wave_label: debrief.wave_label,
        day_number: debrief.day_number,
        published_at: debrief.published_at,
      }}
      blocks={rawBlocks ?? []}
      paletteIndex={paletteIndex}
    />
  );
}
