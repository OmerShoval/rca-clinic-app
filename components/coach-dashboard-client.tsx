"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useMotionVariants } from "@/lib/motion";

interface Student {
  id: string;
  full_name: string;
  slug: string;
  stage: number;
  focus_skill: string | null;
  status: "draft" | "live";
  clinic_id: number;
}

interface Clinic {
  id: number;
  number: number;
  name: string;
}

interface Props {
  students: Student[];
  clinics: Clinic[];
}

const stageLabel = ["", "Beginner", "Developing", "Intermediate", "Advanced", "Expert"];

export function CoachDashboardClient({ students, clinics }: Props) {
  const router = useRouter();
  const { riseIn, staggerChildren } = useMotionVariants();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/coach/auth", { method: "DELETE" });
    router.push("/coach");
  }

  // Group students by clinic
  const byClinic = clinics.map((c) => ({
    clinic: c,
    students: students.filter((s) => s.clinic_id === c.id),
  })).filter((g) => g.students.length > 0);

  const ungrouped = students.filter(
    (s) => !clinics.some((c) => c.id === s.clinic_id)
  );

  return (
    <div className="min-h-screen bg-abyss">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 1000px 400px at 70% -5%, rgba(224,182,79,0.05), transparent 60%)",
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(7,15,21,0.88)",
          borderBottom: "1px solid var(--glass-edge)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div>
          <p className="font-display text-gold text-[10px] tracking-[0.3em]">Ocean Athlete</p>
          <h1 className="font-display text-ink text-2xl leading-none">Coach Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="font-display text-[10px] tracking-widest text-ink-faint hover:text-teal transition-colors px-3 py-2 rounded-xl"
            style={{ border: "1px solid var(--glass-edge)" }}
          >
            Student Login →
          </a>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="font-display text-[10px] tracking-widest text-ink-faint hover:text-coral transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">

        {/* Phase notice */}
        <div
          className="rounded-2xl px-5 py-4 mb-6"
          style={{
            background: "var(--gold-soft)",
            border: "1px solid rgba(224,182,79,0.3)",
          }}
        >
          <p className="font-display text-gold text-[11px] tracking-widest mb-1">Phase 2 — Coming Next</p>
          <p className="text-ink-dim text-sm leading-relaxed">
            The full debrief editor (wave blocks, video slots, Back Home content, Ask Omer inbox)
            is being built in Phase 2. For now, use this dashboard to review your student roster
            and preview each student&apos;s home screen.
          </p>
        </div>

        {/* Student roster by clinic */}
        {byClinic.map(({ clinic, students: groupStudents }) => (
          <section key={clinic.id} className="mb-6">
            <p className="font-display text-gold text-[11px] tracking-[0.25em] mb-3 px-1">
              {clinic.name}
            </p>
            <motion.div
              variants={staggerChildren(0.05)}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-2"
            >
              {groupStudents.map((student) => (
                <StudentRow key={student.id} student={student} riseIn={riseIn} />
              ))}
            </motion.div>
          </section>
        ))}

        {ungrouped.length > 0 && (
          <section className="mb-6">
            <p className="font-display text-ink-faint text-[11px] tracking-[0.25em] mb-3 px-1">
              Unassigned
            </p>
            <div className="flex flex-col gap-2">
              {ungrouped.map((student) => (
                <StudentRow key={student.id} student={student} riseIn={riseIn} />
              ))}
            </div>
          </section>
        )}

        {students.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌊</p>
            <p className="font-display text-ink text-xl mb-2">No students yet</p>
            <p className="text-ink-dim text-sm">Student CRUD editor coming in Phase 2.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StudentRow({
  student,
  riseIn,
}: {
  student: Student;
  riseIn: ReturnType<typeof useMotionVariants>["riseIn"];
}) {
  const initials = student.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      variants={riseIn}
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: "var(--glass)",
        border: "1px solid var(--glass-edge)",
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display text-teal text-sm"
        style={{ background: "rgba(47,214,192,0.12)" }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm font-medium">{student.full_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {/* Stage pips */}
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-1 w-3.5 rounded-full"
                style={{
                  background: i < student.stage ? "var(--teal)" : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>
          {student.focus_skill && (
            <span className="text-[10px] text-ink-faint truncate">{student.focus_skill}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className="font-display text-[9px] tracking-widest px-2 py-1 rounded-md flex-shrink-0"
        style={{
          color: student.status === "live" ? "var(--teal)" : "var(--coral)",
          background: student.status === "live" ? "var(--teal-soft)" : "var(--coral-soft)",
        }}
      >
        {student.status.toUpperCase()}
      </span>

      {/* Preview button */}
      <a
        href={`/s/${student.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display text-[10px] tracking-widest text-gold hover:text-ink transition-colors flex-shrink-0 px-3 py-2 rounded-xl"
        style={{ border: "1px solid rgba(224,182,79,0.35)" }}
      >
        Preview ↗
      </a>
    </motion.div>
  );
}
