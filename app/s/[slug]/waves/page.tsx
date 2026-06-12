import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";

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
    .select("id, wave_label, day_number, status, published_at, created_at")
    .eq("student_id", student.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const list = debriefs ?? [];

  return (
    <main className="flex flex-col px-5 pt-10 pb-6 gap-6">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(47,214,192,0.05), transparent 65%)" }}
      />

      {/* Header */}
      <section>
        <p className="font-display text-teal text-[11px] tracking-[0.35em] mb-1">My Waves</p>
        <h1 className="font-display text-ink text-[clamp(32px,8vw,48px)] leading-none">
          Your Sessions
        </h1>
        <p className="text-ink-dim text-sm mt-2">
          {list.length === 0
            ? "Omer will publish your first debrief after your next session."
            : `${list.length} debrief${list.length !== 1 ? "s" : ""} from your coach`}
        </p>
      </section>

      {/* Debrief list */}
      {list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((d, i) => (
            <Link key={d.id} href={`/s/${slug}/waves/${d.id}`} className="block">
              <div
                className="rounded-2xl px-4 py-4 flex items-center gap-4 transition-opacity active:opacity-70"
                style={{
                  background: "var(--glass)",
                  border: "1px solid var(--glass-edge)",
                  borderLeft: "3px solid var(--teal)",
                }}
              >
                {/* Index number */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-display text-teal text-sm"
                  style={{ background: "var(--teal-soft)" }}
                >
                  {list.length - i}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-ink text-sm font-medium leading-snug">{d.wave_label}</p>
                  {d.published_at && (
                    <p className="font-display text-[9px] tracking-widest text-ink-faint mt-0.5">
                      {new Date(d.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                <span className="text-ink-faint text-sm flex-shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ border: "1.5px dashed var(--glass-edge)" }}
        >
          <p className="text-4xl mb-3">🏄</p>
          <p className="font-display text-ink text-xl mb-1">No debriefs yet</p>
          <p className="text-ink-dim text-sm">Check back after your next session</p>
        </div>
      )}
    </main>
  );
}
