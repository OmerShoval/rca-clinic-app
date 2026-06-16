import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { WavesList } from "@/components/student/waves-list";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WavesPage({ params }: Props) {
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
    .select("id, full_name, slug")
    .eq("id", session.student_id)
    .single();
  if (!student || student.slug !== slug) redirect("/");

  const { data: debriefs } = await db
    .from("debriefs")
    .select("id, wave_label, day_number, status, published_at, created_at, tag")
    .eq("student_id", student.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return <WavesList slug={slug} debriefs={debriefs ?? []} />;
}
