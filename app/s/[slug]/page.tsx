import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { LibraryHome } from "@/components/student/library-home";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function StudentHome({ params }: Props) {
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
    .select("full_name, slug, stage, focus_skill")
    .eq("id", session.student_id)
    .single();
  if (!student || student.slug !== slug) redirect("/");

  const { data: debriefs } = await db
    .from("debriefs")
    .select("id, wave_label, day_number, published_at, tag, cover_color_index, cover_image_url")
    .eq("student_id", session.student_id)
    .not("published_at", "is", null)
    .order("created_at", { ascending: false });

  const { data: translations } = await db
    .from("translations")
    .select("environment")
    .eq("student_id", session.student_id);

  const hasIsraelOcean = !!translations?.find((t) => t.environment === "israel_ocean");
  const hasWavePool = !!translations?.find((t) => t.environment === "wave_pool");

  return (
    <LibraryHome
      slug={slug}
      studentName={student.full_name}
      stage={student.stage}
      focusSkill={student.focus_skill}
      debriefs={debriefs ?? []}
      hasIsraelOcean={hasIsraelOcean}
      hasWavePool={hasWavePool}
    />
  );
}
