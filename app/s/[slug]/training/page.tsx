import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { TrainingClient } from "@/components/student/training-client";
import type { StrategyData } from "@/components/student/strategy-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TrainingPage({ params }: Props) {
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
    .select("id, slug, full_name, training_program, build_strategy")
    .eq("id", session.student_id)
    .single();
  if (!student || student.slug !== slug) redirect("/");

  // Fetch last 10 weeks of habit logs
  const since = new Date();
  since.setDate(since.getDate() - 70);
  const { data: logs } = await db
    .from("habit_logs")
    .select("log_date, completed_habits, notes")
    .eq("student_id", student.id)
    .gte("log_date", since.toISOString().split("T")[0])
    .order("log_date", { ascending: true });

  return (
    <TrainingClient
      studentName={student.full_name}
      program={(student.training_program as { title: string; duration_min: number; exercises: { icon: string; name: string; detail: string }[]; habits: string[]; why?: string } | null) ?? null}
      initialLogs={(logs ?? []) as { log_date: string; completed_habits: string[]; notes?: string | null }[]}
      strategy={(student.build_strategy as StrategyData | null) ?? null}
    />
  );
}
