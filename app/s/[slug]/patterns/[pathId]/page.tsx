import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { buildPaths } from "@/lib/patterns";
import { PatternTrail } from "@/components/student/pattern-trail";
import type { StrategyData } from "@/components/student/strategy-view";

interface Props {
  params: Promise<{ slug: string; pathId: string }>;
}

export default async function PatternTrailPage({ params }: Props) {
  const { slug, pathId } = await params;
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
    .select("id, slug, full_name, build_strategy")
    .eq("id", session.student_id)
    .single();
  if (!student || student.slug !== slug) redirect("/");

  const paths = buildPaths((student.build_strategy as StrategyData | null) ?? null);
  const path = paths.find((p) => p.id === pathId);

  if (!path) redirect(`/s/${slug}/patterns`);

  return <PatternTrail slug={slug} path={path} />;
}
