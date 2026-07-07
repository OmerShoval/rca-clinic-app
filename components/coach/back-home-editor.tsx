"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { VoiceRecorder } from "@/components/coach/voice-recorder";
import { VideoUploader } from "@/components/coach/video-uploader";
import type { Translation } from "@/lib/database.types";

type Environment = "israel_ocean" | "wave_pool";

const ENV_META: Record<Environment, { label: string; color: string; bg: string; border: string }> = {
  israel_ocean: { label: "Israel Ocean", color: "var(--teal)", bg: "var(--teal-soft)", border: "rgba(47,214,192,0.3)" },
  wave_pool: { label: "Wave Pool", color: "var(--gold)", bg: "var(--gold-soft)", border: "rgba(224,182,79,0.3)" },
};

const FIELDS = [
  { key: "whats_different", label: "What's Different Here", placeholder: "How does this environment differ from what they know?", multiline: true },
  { key: "try_first", label: "Try First", placeholder: "The #1 thing to attempt on first waves…", multiline: true },
  { key: "on_wave_reminder", label: "On-Wave Reminder", placeholder: "One cue to remember mid-ride…", multiline: false },
];

interface Props {
  studentId: string;
  studentSlug: string;
  environment: Environment;
  /** Cosmetic — used only for the upload-queue label. Falls back to the slug. */
  studentName?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BackHomeEditor({ studentId, studentSlug, environment, studentName }: Props) {
  const [data, setData] = useState<Partial<Translation>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const meta = ENV_META[environment];

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<Partial<Translation>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coach/translations?studentId=${studentId}`)
      .then((r) => r.json())
      .then((list: Translation[]) => {
        const match = list.find((t) => t.environment === environment) ?? {};
        setData(match);
        dataRef.current = match;
      })
      .finally(() => setLoading(false));
  }, [studentId, environment]);

  function handleChange(field: string, value: string) {
    const next = { ...dataRef.current, [field]: value };
    setData(next);
    dataRef.current = next;
    scheduleSave(next);
  }

  function scheduleSave(current: Partial<Translation>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/coach/translations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            environment,
            ...current,
          }),
        });
        if (!res.ok) throw new Error();
        const saved = await res.json();
        dataRef.current = saved;
        setData(saved);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 1200);
  }

  async function handleVoiceSave(url: string) {
    const next = { ...dataRef.current, personal_note_url: url };
    dataRef.current = next;
    setData(next);
    await fetch("/api/coach/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, environment, ...next }),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 rounded-full border-2 border-teal border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div
      key={`${studentId}-${environment}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="rounded-lg px-3 py-1"
          style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
        >
          <span className="font-display text-[11px] tracking-widest" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <span className={`font-display text-[9px] tracking-widest ${saveStatus === "saved" ? "text-teal" : saveStatus === "saving" ? "text-gold" : saveStatus === "error" ? "text-coral" : "text-transparent"}`}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Error" : "·"}
        </span>
      </div>

      {/* Fields */}
      {FIELDS.map(({ key, label, placeholder, multiline }) => (
        <div key={key}>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">{label}</label>
          {multiline ? (
            <textarea
              value={(data as Record<string, string>)[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none resize-none"
              style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
            />
          ) : (
            <input
              type="text"
              value={(data as Record<string, string>)[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
              style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
            />
          )}
        </div>
      ))}

      {/* Reference video — upload / paste / pick from library */}
      <div>
        <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">Reference Video</label>
        <VideoUploader
          label="Reference Video"
          studentSlug={studentSlug}
          studentName={studentName ?? studentSlug}
          studentId={studentId}
          value={(data as Record<string, string>).video_url ?? ""}
          accentColor={meta.color}
          accentBg={meta.bg}
          accentBorder={meta.border}
          sourceType="back_home"
          sourceId={(data as Partial<Translation>).id ?? environment}
          tags={[meta.label]}
          onChange={(url) => handleChange("video_url", url)}
        />
      </div>

      {/* Voice note */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
      >
        <VoiceRecorder
          studentSlug={studentSlug}
          initialUrl={(data as Translation).personal_note_url ?? null}
          onSave={handleVoiceSave}
        />
      </div>
    </motion.div>
  );
}
