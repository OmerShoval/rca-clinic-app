"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Student, Clinic } from "@/lib/database.types";

interface Props {
  clinics: Clinic[];
  student?: Student | null;
  onSave: (student: Student) => void;
  onCancel: () => void;
}

const STAGE_LABELS = ["", "Beginner", "Developing", "Intermediate", "Advanced", "Expert"];

export function StudentForm({ clinics, student, onSave, onCancel }: Props) {
  const isEdit = !!student;

  const [fullName, setFullName] = useState(student?.full_name ?? "");
  const [clinicId, setClinicId] = useState<number>(student?.clinic_id ?? clinics[0]?.id ?? 0);
  const [stage, setStage] = useState(student?.stage ?? 1);
  const [awareness, setAwareness] = useState(student?.awareness ?? 1);
  const [execution, setExecution] = useState(student?.execution ?? 1);
  const [focusSkill, setFocusSkill] = useState(student?.focus_skill ?? "");
  const [whatsapp, setWhatsapp] = useState(student?.whatsapp_number ?? "");
  const [status, setStatus] = useState<"draft" | "live">(student?.status ?? "draft");
  const [pin, setPin] = useState("");
  const [hasExistingPin] = useState(!!(student as { pin_hash?: string | null })?.pin_hash);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!fullName.trim()) { setError("Name is required"); return; }
    if (!clinicId) { setError("Select a clinic"); return; }

    setSaving(true);
    setError(null);

    try {
      const body = {
        full_name: fullName.trim(),
        clinic_id: clinicId,
        stage,
        awareness,
        execution,
        focus_skill: focusSkill.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        status,
        // Only send pin when a new value is typed; blank = keep existing
        ...(pin.trim() ? { pin: pin.trim() } : {}),
      };

      const res = isEdit
        ? await fetch(`/api/coach/students/${student!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/coach/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to save");
      }

      const saved = await res.json();
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl text-ink tracking-wide">
          {isEdit ? "Edit Student" : "Add Student"}
        </h2>
        <button onClick={onCancel} className="font-display text-[10px] tracking-widest text-ink-faint hover:text-ink">
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 overflow-y-auto">
        {/* Name */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">Full Name *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Noy Bar Lev"
            required
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
            style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(224,182,79,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
          />
        </div>

        {/* Clinic */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">Clinic *</label>
          <select
            value={clinicId}
            onChange={(e) => setClinicId(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink outline-none"
            style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
          >
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Stage */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">
            Stage — {STAGE_LABELS[stage]}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className="flex-1 py-2 rounded-lg font-display text-xs transition-all"
                style={stage === s
                  ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.4)" }
                  : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Awareness + Execution */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">Awareness ({awareness}/5)</label>
            <input
              type="range" min={1} max={5} value={awareness}
              onChange={(e) => setAwareness(Number(e.target.value))}
              className="w-full accent-teal"
            />
          </div>
          <div>
            <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">Execution ({execution}/5)</label>
            <input
              type="range" min={1} max={5} value={execution}
              onChange={(e) => setExecution(Number(e.target.value))}
              className="w-full accent-teal"
            />
          </div>
        </div>

        {/* Focus Skill */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">Focus Skill</label>
          <input
            type="text"
            value={focusSkill}
            onChange={(e) => setFocusSkill(e.target.value)}
            placeholder="e.g. Bottom turn timing"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
            style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">WhatsApp Number</label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+972501234567"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
            style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
          />
        </div>

        {/* PIN */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">
            4-Digit PIN {hasExistingPin && !pin ? "(set — enter new to change, leave blank to keep)" : "(optional)"}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder={hasExistingPin ? "Enter new PIN to change…" : "e.g. 2712"}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none tracking-[0.4em]"
            style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
          />
          {hasExistingPin && !pin && (
            <p className="text-[10px] text-ink-faint mt-1">Student currently has a PIN set. Leave blank to keep it.</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">Visibility</label>
          <div className="flex gap-2">
            {(["draft", "live"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className="flex-1 py-2 rounded-lg font-display text-[11px] tracking-widest transition-all"
                style={status === s
                  ? s === "live"
                    ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.4)" }
                    : { background: "var(--coral-soft)", color: "var(--coral)", border: "1px solid rgba(255,107,94,0.3)" }
                  : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
                }
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-coral text-sm rounded-xl px-3 py-2" style={{ background: "var(--coral-soft)" }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-2xl font-display text-[13px] tracking-widest text-abyss transition-opacity disabled:opacity-60 mt-2 gold-sheen"
          style={{ background: "var(--gold)" }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Student"}
        </button>
      </form>
    </motion.div>
  );
}
