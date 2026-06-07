"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Check, X, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Student, Session } from "@/lib/database.types";

interface WaveEntry {
  id?: string;
  waveNumber: number;
  beforeNotes: string;
  duringNotes: string;
  afterNotes: string;
  socialNotes: string;
  isSuccess: boolean | null;
}

interface WaveSessionProps {
  student: Student;
  session: Session;
  onEndSession: () => void;
}

const emptyDraft = (): Omit<WaveEntry, "id" | "waveNumber"> => ({
  beforeNotes: "",
  duringNotes: "",
  afterNotes: "",
  socialNotes: "",
  isSuccess: null,
});

export function WaveSession({ student, session, onEndSession }: WaveSessionProps) {
  const [waves, setWaves] = useState<WaveEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [expandedWave, setExpandedWave] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);

  const successCount = waves.filter((w) => w.isSuccess === true).length;
  const badCount = waves.filter((w) => w.isSuccess === false).length;

  async function saveWave() {
    setSaving(true);
    const waveNumber = waves.length + 1;
    try {
      const { data } = await supabase
        .from("wave_logs")
        .insert({
          session_id: session.id,
          student_id: student.id,
          wave_number: waveNumber,
          before_notes: draft.beforeNotes || null,
          during_notes: draft.duringNotes || null,
          after_notes: draft.afterNotes || null,
          social_notes: draft.socialNotes || null,
          is_success: draft.isSuccess,
        })
        .select()
        .single();

      setWaves((prev) => [
        ...prev,
        { id: (data as { id?: string } | null)?.id, waveNumber, ...draft },
      ]);
      setDraft(emptyDraft());
      setLogOpen(false);
    } catch (err) {
      console.error("Wave save error:", err);
    }
    setSaving(false);
  }

  async function handleEndSession() {
    setEnding(true);
    try {
      await supabase.from("daily_stats").insert({
        student_id: student.id,
        session_id: session.id,
        day_number: session.day_number,
        wave_count: waves.length,
        success_count: successCount,
        bad_count: badCount,
      });
    } catch (err) {
      console.error("Stats save error:", err);
    }
    onEndSession();
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen gradient-ocean flex flex-col"
    >
      {/* Header */}
      <div className="px-6 pt-10 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">
              Day {session.day_number} · Session {session.session_number}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{student.name}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatBox value={waves.length} label="Waves" color="teal" />
          <StatBox value={successCount} label="Success" color="green" />
          <StatBox value={badCount} label="Learning" color="red" />
        </div>
      </div>

      {/* Wave list */}
      <div className="flex-1 px-6 pb-4 space-y-2 overflow-y-auto">
        <AnimatePresence>
          {waves.map((wave) => (
            <motion.div
              key={wave.waveNumber}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card border border-border/40 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedWave(expandedWave === wave.waveNumber ? null : wave.waveNumber)
                }
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-accent/60 flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {wave.waveNumber}
                  </span>
                  {wave.isSuccess === true && (
                    <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Success
                    </span>
                  )}
                  {wave.isSuccess === false && (
                    <span className="text-red-400/80 text-xs font-medium">Learning moment</span>
                  )}
                  {wave.isSuccess === null && (
                    <span className="text-muted-foreground/60 text-xs">No rating</span>
                  )}
                </div>
                {expandedWave === wave.waveNumber ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground/50" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
                )}
              </button>

              <AnimatePresence>
                {expandedWave === wave.waveNumber && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-2.5">
                      {wave.beforeNotes && <NoteRow label="Before" text={wave.beforeNotes} />}
                      {wave.duringNotes && <NoteRow label="During" text={wave.duringNotes} />}
                      {wave.afterNotes && <NoteRow label="After" text={wave.afterNotes} />}
                      {wave.socialNotes && <NoteRow label="Vibed with" text={wave.socialNotes} />}
                      {!wave.beforeNotes && !wave.duringNotes && !wave.afterNotes && !wave.socialNotes && (
                        <p className="text-xs text-muted-foreground/50">No notes added.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-8 space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLogOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-primary-foreground font-semibold glow-teal"
        >
          <Plus className="w-5 h-5" />
          Log Wave
        </motion.button>

        <AnimatePresence>
          {waves.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleEndSession}
              disabled={ending}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border/50 py-3.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50"
            >
              <BarChart3 className="w-4 h-4" />
              {ending ? "Saving..." : "End Session & See Progress"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Log wave sheet */}
      <AnimatePresence>
        {logOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 z-50 flex items-end"
            onClick={(e) => e.target === e.currentTarget && setLogOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-t-3xl bg-card border-t border-border/50 px-6 pt-5 pb-10 max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">Wave #{waves.length + 1}</h2>
                <button
                  onClick={() => setLogOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <NoteInput
                  label="Before the wave"
                  placeholder="What was your intention going in?"
                  value={draft.beforeNotes}
                  onChange={(v) => setDraft((d) => ({ ...d, beforeNotes: v }))}
                />
                <NoteInput
                  label="During the wave"
                  placeholder="What did you feel on the board?"
                  value={draft.duringNotes}
                  onChange={(v) => setDraft((d) => ({ ...d, duringNotes: v }))}
                />
                <NoteInput
                  label="After the wave"
                  placeholder="What did you take away?"
                  value={draft.afterNotes}
                  onChange={(v) => setDraft((d) => ({ ...d, afterNotes: v }))}
                />
                <NoteInput
                  label="Vibed with..."
                  placeholder="Who did you share energy with?"
                  value={draft.socialNotes}
                  onChange={(v) => setDraft((d) => ({ ...d, socialNotes: v }))}
                />

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2.5">
                    Rate this wave
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        setDraft((d) => ({ ...d, isSuccess: d.isSuccess === true ? null : true }))
                      }
                      className={[
                        "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border text-sm font-medium transition-all",
                        draft.isSuccess === true
                          ? "bg-green-500/15 border-green-500/40 text-green-400"
                          : "border-border/40 text-muted-foreground hover:border-green-500/20 hover:text-green-400/70",
                      ].join(" ")}
                    >
                      <Check className="w-4 h-4" />
                      Success
                    </button>
                    <button
                      onClick={() =>
                        setDraft((d) => ({ ...d, isSuccess: d.isSuccess === false ? null : false }))
                      }
                      className={[
                        "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border text-sm font-medium transition-all",
                        draft.isSuccess === false
                          ? "bg-red-500/12 border-red-500/35 text-red-400"
                          : "border-border/40 text-muted-foreground hover:border-red-500/20 hover:text-red-400/70",
                      ].join(" ")}
                    >
                      <X className="w-4 h-4" />
                      Learning
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={saveWave}
                  disabled={saving}
                  className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold glow-teal disabled:opacity-60 mt-2"
                >
                  {saving ? "Saving..." : "Save Wave"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatBox({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "teal" | "green" | "red";
}) {
  const colorClass =
    color === "teal"
      ? "text-teal border-primary/20"
      : color === "green"
      ? "text-green-400 border-green-500/20"
      : "text-red-400 border-red-500/20";

  return (
    <div className={`rounded-2xl bg-card border ${colorClass} px-3 py-3`}>
      <p className={`text-2xl font-bold ${colorClass.split(" ")[0]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function NoteRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">{label}</p>
      <p className="text-sm text-foreground/80 mt-0.5 leading-snug">{text}</p>
    </div>
  );
}

function NoteInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1.5">
        {label}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-xl bg-accent/50 border border-border/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-primary/40 transition-colors"
      />
    </div>
  );
}
