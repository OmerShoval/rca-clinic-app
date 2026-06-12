import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { AskClient } from "@/components/student/ask-client";
import type { Thread } from "@/lib/database.types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AskPage({ params }: Props) {
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

  const { data: threads } = await db
    .from("threads")
    .select("*")
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false });

  return (
    <main className="flex flex-col px-5 pt-10 pb-6 gap-6">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(255,107,94,0.04), transparent 65%)" }}
      />

      {/* Header */}
      <section>
        <p className="font-display text-coral text-[11px] tracking-[0.35em] mb-1">Ask Omer</p>
        <h1 className="font-display text-ink text-[clamp(32px,8vw,48px)] leading-none">
          Send a Question
        </h1>
        <p className="text-ink-dim text-sm mt-2">
          Omer reviews every Sunday and replies by Monday.
        </p>
      </section>

      <AskClient initialThreads={(threads as Thread[]) ?? []} />
    </main>
  );
}
