"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WorkoutCard } from "@/components/ui/workout-card";
import { HabitHeatmap } from "@/components/ui/habit-heatmap";
import { useLanguage } from "@/lib/language-context";
import type { HabitLog } from "@/components/ui/habit-heatmap";
import type { StrategyData } from "@/components/student/strategy-view";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TrainingProgram {
  title: string;
  duration_min: number;
  exercises: { icon: string; name: string; detail: string }[];
  habits: string[];
  why?: string; // coach's note on why this program
}

interface Props {
  studentName: string;
  program: TrainingProgram | null;
  initialLogs: HabitLog[];
  strategy: StrategyData | null;
}

// ── WHY Section ───────────────────────────────────────────────────────────────

function WhySection({ program, strategy }: { program: TrainingProgram | null; strategy: StrategyData | null }) {
  const goals = strategy?.nodes?.filter((n) => n.type === "goal") ?? [];
  const context = strategy?.nodes?.filter((n) => n.type === "context") ?? [];
  const hasContent = program?.why || goals.length > 0 || context.length > 0;

  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "rgba(139,92,246,0.08)",
        border: "1.5px solid rgba(139,92,246,0.22)",
      }}
    >
      <p className="font-display text-[8px] tracking-[0.3em] text-purple-400">WHY THIS PROGRAM</p>

      {program?.why && (
        <p className="font-display text-[13px] tracking-wide text-ink leading-relaxed" style={{ fontStyle: "italic" }}>
          &ldquo;{program.why}&rdquo;
        </p>
      )}

      {context.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {context.map((c) => (
            <span
              key={c.id}
              className="font-display text-[9px] tracking-wide px-3 py-1.5 rounded-full"
              style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.3)", color: "rgb(167,139,250)" }}
            >
              {c.data.label}
            </span>
          ))}
        </div>
      )}

      {goals.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-[8px] tracking-[0.2em] text-ink-faint">STRATEGY GOALS</p>
          {goals.slice(0, 3).map((g) => (
            <div key={g.id} className="flex items-start gap-2">
              <span className="font-display text-teal mt-0.5 flex-shrink-0" style={{ fontSize: 10 }}>→</span>
              <p className="font-display text-[11px] tracking-wide text-ink leading-snug">{g.data.label}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Habit Log Form ─────────────────────────────────────────────────────────────

function HabitLogForm({
  habits,
  todayLog,
  onSaved,
}: {
  habits: string[];
  todayLog: HabitLog | null;
  onSaved: (log: HabitLog) => void;
}) {
  const [checked, setChecked] = useState<string[]>(todayLog?.completed_habits ?? []);
  const [notes, setNotes] = useState(todayLog?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  function toggle(h: string) {
    setChecked((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/habit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_date: today, completed_habits: checked, notes: notes.trim() || null }),
      });
      if (res.ok) {
        setSaved(true);
        onSaved({ log_date: today, completed_habits: checked, notes: notes.trim() || null });
      }
    } finally {
      setSaving(false);
    }
  }

  if (!habits.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
      className="rounded-2xl p-4 flex flex-col gap-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div>
        <p className="font-display text-[8px] tracking-[0.3em] text-teal">TODAY&apos;S CHECK-IN</p>
        <p className="font-display text-[10px] text-ink-faint mt-0.5">{today}</p>
      </div>

      {/* Habit checkboxes */}
      <div className="flex flex-col gap-2">
        {habits.map((habit) => {
          const done = checked.includes(habit);
          return (
            <button
              key={habit}
              onClick={() => toggle(habit)}
              className="flex items-center gap-3 rounded-xl p-3 text-left transition-all"
              style={{
                background: done ? "rgba(47,214,192,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${done ? "rgba(47,214,192,0.35)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: done ? "var(--teal)" : "rgba(255,255,255,0.06)",
                  border: done ? "none" : "1.5px solid rgba(255,255,255,0.18)",
                }}
              >
                {done && <span className="text-abyss text-[10px] font-bold">✓</span>}
              </div>
              <p className="font-display text-[12px] tracking-wide text-ink">{habit}</p>
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        placeholder="Any notes from today's session… (optional)"
        rows={2}
        className="w-full bg-transparent font-display text-[11px] tracking-wide text-ink placeholder-ink-faint rounded-xl p-3 resize-none outline-none"
        style={{ border: "1px solid rgba(255,255,255,0.07)" }}
      />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl py-2.5 font-display text-[10px] tracking-[0.2em] transition-all"
        style={{
          background: saved ? "rgba(47,214,192,0.15)" : "rgba(47,214,192,0.12)",
          border: `1px solid ${saved ? "rgba(47,214,192,0.5)" : "rgba(47,214,192,0.25)"}`,
          color: "var(--teal)",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "SAVING…" : saved ? "✓ SAVED" : "SAVE CHECK-IN"}
      </button>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyProgram() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span className="text-5xl">🏄</span>
      <p className="font-display text-ink text-xl">Program coming soon</p>
      <p className="font-display text-ink-faint text-xs tracking-wide">Your coach will set up your personal training program.</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TrainingClient({ studentName, program, initialLogs, strategy }: Props) {
  const { t } = useLanguage();
  const firstName = studentName.split(" ")[0].toUpperCase();
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);
  const today = new Date().toISOString().split("T")[0];
  const todayLog = logs.find((l) => l.log_date === today) ?? null;

  const handleLogSaved = useCallback((log: HabitLog) => {
    setLogs((prev) => {
      const without = prev.filter((l) => l.log_date !== log.log_date);
      return [...without, log].sort((a, b) => a.log_date.localeCompare(b.log_date));
    });
  }, []);

  const weekDay = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <main className="flex flex-col gap-6 pt-10 pb-28 px-5">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(47,214,192,0.04), transparent 65%)",
        }}
      />

      {/* Header */}
      <header className="flex flex-col gap-0.5">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-ink-faint"
          style={{ fontSize: 11, letterSpacing: "0.38em", textTransform: "uppercase" }}
        >
          {t("train_my")}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-ink leading-none"
          style={{ fontSize: "clamp(44px, 11vw, 64px)" }}
        >
          {t("train_heading")}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center gap-2 mt-1"
        >
          <span className="font-display text-teal" style={{ fontSize: 11, letterSpacing: "0.25em" }}>{firstName}</span>
          <span className="font-display text-ink-faint" style={{ fontSize: 10, letterSpacing: "0.15em" }}>· {weekDay.toUpperCase()}</span>
        </motion.div>
      </header>

      {!program ? (
        <EmptyProgram />
      ) : (
        <>
          {/* Workout Card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <WorkoutCard
              sessionTitle={program.title}
              sessionDuration={program.duration_min}
              exercises={program.exercises}
            />
          </motion.div>

          {/* WHY Section — pulls from strategy */}
          <WhySection program={program} strategy={strategy} />

          {/* Habit Check-In */}
          <HabitLogForm
            habits={program.habits}
            todayLog={todayLog}
            onSaved={handleLogSaved}
          />

          {/* Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <HabitHeatmap
              logs={logs}
              totalHabits={program.habits.length}
              cardTitle={t("train_consistency")}
              cardDescription={t("train_consistency_sub")}
            />
          </motion.div>
        </>
      )}
    </main>
  );
}
