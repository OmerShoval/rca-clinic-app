import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import Link from "next/link";
import { LetterPop } from "@/components/letter-pop";
import { CardGlass } from "@/components/ui/card-glass";

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

  const { count: debriefCount } = await db
    .from("debriefs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", session.student_id)
    .not("published_at", "is", null);

  return (
    <main className="flex flex-col px-5 pt-12 gap-8">

      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(47,214,192,0.06), transparent 65%)",
        }}
      />

      {/* Greeting */}
      <section className="flex flex-col gap-2">
        <p className="font-display text-teal text-[11px] tracking-[0.35em]">
          Ocean Athlete
        </p>
        <LetterPop name={student.full_name} />
        {student.focus_skill && (
          <p className="text-ink-dim text-sm">
            Focus: <span className="text-ink">{student.focus_skill}</span>
          </p>
        )}

        {/* Stage bar */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-6 rounded-full transition-colors"
                style={{
                  background:
                    i < student.stage ? "var(--teal)" : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>
          <span className="font-display text-[10px] text-ink-faint tracking-widest">
            Stage {student.stage}/5
          </span>
        </div>
      </section>

      {/* Cards */}
      <section className="flex flex-col gap-3">
        <Link href={`/s/${slug}/waves`} className="block">
          <CardGlass spine="teal">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-teal text-[11px] tracking-[0.2em] mb-1">
                  My Waves
                </p>
                <p className="text-ink text-base font-medium leading-snug">
                  {debriefCount
                    ? `${debriefCount} session${debriefCount === 1 ? "" : "s"} from Omer`
                    : "Your debrief sessions from Omer"}
                </p>
                <p className="text-ink-dim text-sm mt-1">
                  Review your waves, corrections, and next steps
                </p>
              </div>
              <span className="text-2xl flex-shrink-0">🌊</span>
            </div>
          </CardGlass>
        </Link>

        <Link href={`/s/${slug}/home-base`} className="block">
          <CardGlass spine="gold">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-gold text-[11px] tracking-[0.2em] mb-1">
                  Back Home
                </p>
                <p className="text-ink text-base font-medium leading-snug">
                  Train what you learned at home
                </p>
                <p className="text-ink-dim text-sm mt-1">
                  Israel ocean and wave pool drills
                </p>
              </div>
              <span className="text-2xl flex-shrink-0">🏠</span>
            </div>
          </CardGlass>
        </Link>

        <Link href={`/s/${slug}/ask`} className="block">
          <CardGlass spine="coral">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-coral text-[11px] tracking-[0.2em] mb-1">
                  Ask Omer
                </p>
                <p className="text-ink text-base font-medium leading-snug">
                  Send a clip or question
                </p>
                <p className="text-ink-dim text-sm mt-1">
                  Omer reviews every Sunday
                </p>
              </div>
              <span className="text-2xl flex-shrink-0">💬</span>
            </div>
          </CardGlass>
        </Link>
      </section>
    </main>
  );
}
