import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { BlockCard } from "@/components/student/block-card";

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

  // Fetch debrief — must belong to this student and be published
  const { data: debrief } = await db
    .from("debriefs")
    .select("id, wave_label, day_number, published_at, status, student_id")
    .eq("id", debriefId)
    .eq("student_id", student.id)
    .eq("status", "published")
    .single();

  if (!debrief) notFound();

  // Fetch all blocks, sorted
  const { data: rawBlocks } = await db
    .from("debrief_blocks")
    .select("*")
    .eq("debrief_id", debrief.id)
    .order("sort");

  const blocks = rawBlocks ?? [];
  const filledBlocks = blocks.filter((b) => b.title || b.body);

  return (
    <main className="flex flex-col px-5 pt-10 pb-6 gap-6">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(47,214,192,0.06), transparent 65%)" }}
      />

      {/* Header */}
      <section>
        <Link
          href={`/s/${slug}/waves`}
          className="font-display text-[10px] tracking-[0.25em] text-teal mb-4 flex items-center gap-1.5"
        >
          ← My Waves
        </Link>
        <p className="font-display text-teal text-[11px] tracking-[0.35em] mb-1">Debrief</p>
        <h1 className="font-display text-ink text-[clamp(28px,7vw,44px)] leading-none">
          {debrief.wave_label}
        </h1>
        {debrief.published_at && (
          <p className="font-display text-[10px] tracking-widest text-ink-faint mt-2">
            {new Date(debrief.published_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </section>

      {/* Blocks */}
      {filledBlocks.length > 0 ? (
        <div className="flex flex-col gap-3">
          {blocks.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ border: "1.5px dashed var(--glass-edge)" }}
        >
          <p className="text-4xl mb-3">🌊</p>
          <p className="font-display text-ink text-lg mb-1">Content coming soon</p>
          <p className="text-ink-dim text-sm">Omer is still writing up your debrief</p>
        </div>
      )}
    </main>
  );
}
