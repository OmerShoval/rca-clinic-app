"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { BlockEditor } from "@/components/coach/block-editor";
import type { DebriefBlock, Debrief } from "@/lib/database.types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface StudentInfo {
  slug: string;
  full_name: string;
  whatsapp_number: string | null;
}

interface Props {
  debrief: Debrief;
  student: StudentInfo;
  onUpdated: (updated: Debrief) => void;
  onDelete: (id: string) => void;
}

export function DebriefEditor({ debrief, student, onUpdated, onDelete }: Props) {
  const [blocks, setBlocks] = useState<DebriefBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [waveLabel, setWaveLabel] = useState(debrief.wave_label);
  const [status, setStatus] = useState(debrief.status);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocksRef = useRef<DebriefBlock[]>([]);

  useEffect(() => {
    setWaveLabel(debrief.wave_label);
    setStatus(debrief.status);
  }, [debrief.id, debrief.wave_label, debrief.status]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coach/debriefs/${debrief.id}/blocks`)
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data as DebriefBlock[]).sort((a, b) => a.sort - b.sort);
        setBlocks(sorted);
        blocksRef.current = sorted;
      })
      .finally(() => setLoading(false));
  }, [debrief.id]);

  const scheduleBlockSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/coach/debriefs/${debrief.id}/blocks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: blocksRef.current }),
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 1200);
  }, [debrief.id]);

  function handleBlockChange(blockId: string, field: string, value: string) {
    const next = blocks.map((b) =>
      b.id === blockId ? { ...b, [field]: value } : b
    );
    setBlocks(next);
    blocksRef.current = next;
    scheduleBlockSave();
  }

  function handleLabelChange(val: string) {
    setWaveLabel(val);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/coach/debriefs/${debrief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wave_label: val }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdated(updated);
      }
    }, 1000);
  }

  async function togglePublish() {
    const newStatus = status === "published" ? "draft" : "published";
    const res = await fetch(`/api/coach/debriefs/${debrief.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setStatus(updated.status);
      onUpdated(updated);
    }
  }

  async function handleDelete() {
    await fetch(`/api/coach/debriefs/${debrief.id}`, { method: "DELETE" });
    onDelete(debrief.id);
  }

  return (
    <motion.div
      key={debrief.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      {/* Wave label + status row */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={waveLabel}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Wave label…"
          className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none font-display tracking-wide"
          style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(224,182,79,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
        />

        {/* Save indicator */}
        <span className={`font-display text-[9px] tracking-widest flex-shrink-0 ${saveStatus === "saved" ? "text-teal" : saveStatus === "saving" ? "text-gold" : saveStatus === "error" ? "text-coral" : "text-transparent"}`}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Error" : "·"}
        </span>

        {/* Publish toggle */}
        <button
          onClick={togglePublish}
          className="flex-shrink-0 rounded-xl px-3 py-2.5 font-display text-[11px] tracking-widest transition-all"
          style={status === "published"
            ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.3)" }
            : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
          }
        >
          {status === "published" ? "Published" : "Draft"}
        </button>

        {/* WhatsApp notify — only when published and student has a number */}
        {status === "published" && student.whatsapp_number && (
          <a
            href={`https://wa.me/${student.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hey ${student.full_name.split(" ")[0]}! Your new debrief "${waveLabel}" is ready 🌊`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-xl px-3 py-2.5 font-display text-[11px] tracking-widest transition-all"
            style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.3)" }}
          >
            WA
          </a>
        )}
      </div>

      {/* Blocks */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 rounded-full border-2 border-teal border-t-transparent"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {blocks.map((block) => (
            <BlockEditor key={block.id} block={block} onChange={handleBlockChange} />
          ))}
        </div>
      )}

      {/* Delete */}
      <div className="flex justify-end pt-2">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="font-display text-[10px] tracking-widest text-ink-faint hover:text-coral transition-colors"
          >
            Delete Debrief
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-display text-[10px] tracking-widest text-coral">Are you sure?</span>
            <button onClick={handleDelete} className="font-display text-[10px] tracking-widest text-coral hover:opacity-70">
              Yes, delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="font-display text-[10px] tracking-widest text-ink-faint hover:text-ink">
              Cancel
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
