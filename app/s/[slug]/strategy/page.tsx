import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { StrategyPageClient } from "@/components/student/strategy-page-client";
import type { StrategyData } from "@/components/student/strategy-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function StrategyPage({ params }: Props) {
  const { slug } = await params;
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

  return (
    <StrategyPageClient
      studentName={student.full_name}
      strategy={(student.build_strategy as StrategyData | null) ?? null}
    />
  );
}
