"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Exercise {
  icon: string;
  name: string;
  detail: string;
}

interface TrainingProgram {
  title: string;
  duration_min: number;
  exercises: Exercise[];
  habits: string[];
  why?: string;
}

const DEFAULT_PROGRAM: TrainingProgram = {
  title: "",
  duration_min: 45,
  exercises: [],
  habits: [],
  why: "",
};

interface Props {
  studentId: string;
  studentSlug: string;
}

export function TrainingEditor({ studentId, studentSlug }: Props) {
  const [program, setProgram] = useState<TrainingProgram>(DEFAULT_PROGRAM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exercise form
  const [newExIcon, setNewExIcon] = useState("🏄");
  const [newExName, setNewExName] = useState("");
  const [newExDetail, setNewExDetail] = useState("");

  // Habit form
  const [newHabit, setNewHabit] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing program
  useEffect(() => {
    setLoading(true);
    fetch(`/api/coach/students/${studentId}/training`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && !data.error) {
          setProgram({ ...DEFAULT_PROGRAM, ...data });
        }
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const save = useCallback(async (p: TrainingProgram) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/coach/students/${studentId}/training`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Save failed");
      } else {
        setSaved(true);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }, [studentId]);

  function update(partial: Partial<TrainingProgram>) {
    const next = { ...program, ...partial };
    setProgram(next);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(next), 700);
  }

  function addExercise() {
    if (!newExName.trim()) return;
    const ex: Exercise = { icon: newExIcon.trim() || "🏄", name: newExName.trim(), detail: newExDetail.trim() };
    update({ exercises: [...program.exercises, ex] });
    setNewExName("");
    setNewExDetail("");
  }

  function removeExercise(i: number) {
    update({ exercises: program.exercises.filter((_, idx) => idx !== i) });
  }

  function addHabit() {
    if (!newHabit.trim()) return;
    update({ habits: [...program.habits, newHabit.trim()] });
    setNewHabit("");
  }

  function removeHabit(i: number) {
    update({ habits: program.habits.filter((_, idx) => idx !== i) });
  }

  if (loading) {
    return <div className="py-10 text-center font-display text-ink-faint text-sm">Loading training program…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[8px] tracking-[0.3em] text-teal">TRAINING PROGRAM</p>
          <p className="font-display text-[10px] text-ink-faint mt-0.5">Auto-saves. Student sees this at /s/{studentSlug}/training</p>
        </div>
        <a
          href={`/s/${studentSlug}/training`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-[10px] tracking-widest text-gold px-2.5 py-1.5 rounded-lg"
          style={{ border: "1px solid rgba(224,182,79,0.3)" }}
        >
          Preview ↗
        </a>
      </div>

      {error && (
        <p className="font-display text-[10px] text-coral">{error}</p>
      )}

      {/* Session basics */}
      <Section title="Session Info">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block font-display text-[9px] tracking-[0.2em] text-ink-faint mb-1">PROGRAM TITLE</label>
            <input
              value={program.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g. Surf Fitness — Week 1"
              className="w-full bg-transparent font-display text-[12px] text-ink rounded-lg px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
          <div style={{ width: 90 }}>
            <label className="block font-display text-[9px] tracking-[0.2em] text-ink-faint mb-1">DURATION</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={program.duration_min}
                onChange={(e) => update({ duration_min: parseInt(e.target.value, 10) || 45 })}
                className="w-full bg-transparent font-display text-[12px] text-ink rounded-lg px-3 py-2 outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                min={5}
                max={180}
              />
            </div>
            <p className="font-display text-[8px] text-ink-faint mt-1 px-1">minutes</p>
          </div>
        </div>
      </Section>

      {/* WHY */}
      <Section title="WHY — Coach Note">
        <textarea
          value={program.why ?? ""}
          onChange={(e) => update({ why: e.target.value })}
          placeholder="Why is this program important for this student? This shows in the WHY section alongside their strategy goals…"
          rows={3}
          className="w-full bg-transparent font-display text-[12px] text-ink rounded-lg px-3 py-2 outline-none resize-none"
          style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <p className="font-display text-[9px] text-ink-faint mt-1">Also connects to their Build Strategy — goal nodes pull in automatically.</p>
      </Section>

      {/* Exercises */}
      <Section title="Exercises">
        <div className="flex flex-col gap-2 mb-3">
          <AnimatePresence>
            {program.exercises.map((ex, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="text-lg leading-none flex-shrink-0">{ex.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[11px] text-ink truncate">{ex.name}</p>
                  <p className="font-display text-[9px] text-ink-faint truncate">{ex.detail}</p>
                </div>
                <button
                  onClick={() => removeExercise(i)}
                  className="font-display text-[10px] text-coral flex-shrink-0 hover:opacity-70 transition-opacity"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add exercise form */}
        <div className="flex gap-2 items-start">
          <input
            value={newExIcon}
            onChange={(e) => setNewExIcon(e.target.value)}
            placeholder="🏄"
            className="w-10 bg-transparent font-display text-[14px] text-center rounded-lg px-1 py-2 outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              value={newExName}
              onChange={(e) => setNewExName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExercise()}
              placeholder="Exercise name (e.g. Popup Drills)"
              className="w-full bg-transparent font-display text-[11px] text-ink rounded-lg px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <input
              value={newExDetail}
              onChange={(e) => setNewExDetail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExercise()}
              placeholder="Detail (e.g. 3×10 reps, 2 minutes)"
              className="w-full bg-transparent font-display text-[11px] text-ink rounded-lg px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
          <button
            onClick={addExercise}
            className="py-2 px-3 rounded-lg font-display text-[10px] tracking-widest text-teal flex-shrink-0"
            style={{ background: "rgba(47,214,192,0.1)", border: "1px solid rgba(47,214,192,0.25)" }}
          >
            + Add
          </button>
        </div>
      </Section>

      {/* Habits */}
      <Section title="Habit Tracker — Daily Habits">
        <p className="font-display text-[9px] text-ink-faint mb-3">Student checks these off each day and you see consistency via the heatmap.</p>
        <div className="flex flex-col gap-1.5 mb-3">
          <AnimatePresence>
            {program.habits.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: "rgba(47,214,192,0.2)", border: "1px solid rgba(47,214,192,0.3)" }} />
                <p className="flex-1 font-display text-[11px] text-ink">{h}</p>
                <button onClick={() => removeHabit(i)} className="font-display text-[10px] text-coral flex-shrink-0 hover:opacity-70 transition-opacity">✕</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex gap-2">
          <input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="e.g. Morning balance board, Visualization, Beach run…"
            className="flex-1 bg-transparent font-display text-[11px] text-ink rounded-lg px-3 py-2 outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button
            onClick={addHabit}
            className="py-2 px-3 rounded-lg font-display text-[10px] tracking-widest text-teal flex-shrink-0"
            style={{ background: "rgba(47,214,192,0.1)", border: "1px solid rgba(47,214,192,0.25)" }}
          >
            + Add
          </button>
        </div>
      </Section>

      {/* Status */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={() => save(program)}
          disabled={saving}
          className="rounded-xl py-2 px-4 font-display text-[10px] tracking-[0.2em] transition-all"
          style={{
            background: saved ? "rgba(47,214,192,0.15)" : "rgba(47,214,192,0.1)",
            border: `1px solid ${saved ? "rgba(47,214,192,0.5)" : "rgba(47,214,192,0.25)"}`,
            color: "var(--teal)",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "SAVING…" : saved ? "✓ SAVED" : "SAVE NOW"}
        </button>
        {program.exercises.length > 0 && (
          <p className="font-display text-[9px] text-ink-faint">{program.exercises.length} exercises · {program.habits.length} habits</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-display text-[8px] tracking-[0.25em] text-ink-faint uppercase">{title}</p>
      {children}
    </div>
  );
}
