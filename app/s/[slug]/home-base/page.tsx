import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { BackHomeView } from "@/components/student/back-home-view";
import { HomeBaseHeader } from "@/components/student/home-base-header";
import type { Translation } from "@/lib/database.types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HomeBasePage({ params }: Props) {
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
    .select("id, slug")
    .eq("id", session.student_id)
    .single();
  if (!student || student.slug !== slug) redirect("/");

  const { data: translations } = await db
    .from("translations")
    .select("*")
    .eq("student_id", student.id);

  const list = translations ?? [];
  const israel = list.find((t) => t.environment === "israel_ocean") as Translation | null ?? null;
  const wavePool = list.find((t) => t.environment === "wave_pool") as Translation | null ?? null;

  return (
    <main className="flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-nav gap-6">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(224,182,79,0.05), transparent 65%)" }}
      />

      <HomeBaseHeader />

      <BackHomeView israelTranslation={israel} wavePoolTranslation={wavePool} />
    </main>
  );
}
