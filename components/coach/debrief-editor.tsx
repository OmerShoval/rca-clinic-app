"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BlockEditor } from "@/components/coach/block-editor";
import { BOOK_PALETTES } from "@/components/student/book";
import type { DebriefBlock, Debrief } from "@/lib/database.types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface StudentInfo {
  id: string;
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

// ─── CoverCustomizer ─────────────────────────────────────────────────────────

interface CoverCustomizerProps {
  debriefId: string;
  studentSlug: string;
  colorIndex: number | null;
  imageUrl: string | null;
  onColorChange: (idx: number) => void;
  onImageChange: (url: string | null) => void;
}

function CoverCustomizer({ debriefId, studentSlug, colorIndex, imageUrl, onColorChange, onImageChange }: CoverCustomizerProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("studentSlug", studentSlug);
      fd.append("kind", "cover");
      const res = await fetch("/api/coach/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        onImageChange(json.url);
        await fetch(`/api/coach/debriefs/${debriefId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cover_image_url: json.url }),
        });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemoveImage() {
    onImageChange(null);
    await fetch(`/api/coach/debriefs/${debriefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cover_image_url: null }),
    });
  }

  async function handleColorPick(idx: number) {
    onColorChange(idx);
    await fetch(`/api/coach/debriefs/${debriefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cover_color_index: idx }),
    });
  }

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2.5"
      style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
    >
      <p className="font-display text-[9px] tracking-[0.22em] text-ink-faint uppercase">Cover</p>

      {/* Photo upload / preview */}
      <div className="flex items-center gap-2.5">
        {imageUrl ? (
          <div className="relative flex-shrink-0" style={{ width: 48, height: 56 }}>
            <div
              className="w-full h-full rounded-md overflow-hidden"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-display text-[8px]"
              style={{ background: "rgba(255,80,80,0.85)", color: "#fff" }}
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-display text-[10px] tracking-widest transition-opacity"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.18)", color: "var(--ink-faint)" }}
          >
            {uploading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block w-3 h-3 rounded-full border border-teal border-t-transparent"
              />
            ) : (
              <span style={{ fontSize: 13 }}>📷</span>
            )}
            {uploading ? "Uploading…" : "Add Photo"}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={handleImageUpload}
        />

        {imageUrl && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="font-display text-[9px] tracking-widest text-ink-faint hover:text-ink transition-colors"
          >
            Change
          </button>
        )}
      </div>

      {/* Color palette swatches (shown when no photo) */}
      {!imageUrl && (
        <div className="flex gap-1.5 flex-wrap">
          {BOOK_PALETTES.map((pal, idx) => {
            const active = (colorIndex ?? 0) === idx;
            return (
              <button
                key={idx}
                onClick={() => handleColorPick(idx)}
                className="w-6 h-6 rounded-md flex-shrink-0 transition-transform"
                style={{
                  background: pal.top,
                  outline: active ? `2px solid ${pal.accent}` : "2px solid transparent",
                  outlineOffset: 1,
                  transform: active ? "scale(1.15)" : "scale(1)",
                }}
                aria-label={`Color ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TagPicker ───────────────────────────────────────────────────────────────

interface TagPickerProps {
  debriefId: string;
  currentTag: string | null;
  onTagChange: (tag: string | null) => void;
}

function TagPicker({ debriefId, currentTag, onTagChange }: TagPickerProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/coach/tags")
      .then((r) => r.json())
      .then((data: { name: string }[]) => setTags(data.map((t) => t.name)));
  }, []);

  async function saveTag(tag: string | null) {
    onTagChange(tag);
    setOpen(false);
    await fetch(`/api/coach/debriefs/${debriefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/coach/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const created: { name: string } = await res.json();
        setTags((prev) => [...prev.filter((t) => t !== created.name), created.name].sort());
        setNewTagName("");
        await saveTag(created.name);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-display text-[10px] tracking-widest transition-all"
        style={
          currentTag
            ? { background: "rgba(47,214,192,0.1)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.3)" }
            : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
        }
      >
        <span style={{ fontSize: 11 }}>🏷</span>
        {currentTag ?? "Tag"}
        <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{
              minWidth: 180,
              background: "#0e1c1a",
              border: "1px solid rgba(47,214,192,0.18)",
            }}
          >
            {/* Clear tag */}
            {currentTag && (
              <button
                onClick={() => saveTag(null)}
                className="w-full text-left px-3 py-2 font-display text-[10px] tracking-widest text-coral hover:bg-white/5 transition-colors"
              >
                ✕  Remove Tag
              </button>
            )}

            {/* Existing tags */}
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => saveTag(t)}
                className="w-full text-left px-3 py-2 font-display text-[10px] tracking-widest transition-colors"
                style={{
                  color: t === currentTag ? "var(--teal)" : "var(--ink)",
                  background: t === currentTag ? "rgba(47,214,192,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => { if (t !== currentTag) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (t !== currentTag) e.currentTarget.style.background = "transparent"; }}
              >
                {t === currentTag ? "✓ " : "   "}{t}
              </button>
            ))}

            {/* New tag input */}
            <div
              className="flex items-center gap-1.5 px-2 py-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createTag(); }}
                placeholder="New tag…"
                className="flex-1 min-w-0 rounded-lg px-2 py-1 font-display text-[10px] tracking-wide text-ink placeholder:text-ink-faint outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button
                onClick={createTag}
                disabled={!newTagName.trim() || creating}
                className="flex-shrink-0 rounded-lg px-2 py-1 font-display text-[9px] tracking-widest text-teal transition-opacity disabled:opacity-40"
                style={{ background: "rgba(47,214,192,0.1)" }}
              >
                {creating ? "…" : "Add"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-outside to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}

// ─── DebriefEditor ───────────────────────────────────────────────────────────

export function DebriefEditor({ debrief, student, onUpdated, onDelete }: Props) {
  const [blocks, setBlocks] = useState<DebriefBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [waveLabel, setWaveLabel] = useState(debrief.wave_label);
  const [dayNumber, setDayNumber] = useState<string>(debrief.day_number != null ? String(debrief.day_number) : "");
  const [status, setStatus] = useState(debrief.status);
  const [tag, setTag] = useState<string | null>(debrief.tag ?? null);
  const [colorIndex, setColorIndex] = useState<number | null>(debrief.cover_color_index ?? null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(debrief.cover_image_url ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocksRef = useRef<DebriefBlock[]>([]);

  useEffect(() => {
    setWaveLabel(debrief.wave_label);
    setStatus(debrief.status);
    setTag(debrief.tag ?? null);
    setColorIndex(debrief.cover_color_index ?? null);
    setCoverImageUrl(debrief.cover_image_url ?? null);
  }, [debrief.id, debrief.wave_label, debrief.status, debrief.tag, debrief.cover_color_index, debrief.cover_image_url]);

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

    // Auto-save video URLs to the student's video library (fire-and-forget)
    if ((field === "video_url" || field === "video_url_secondary") && value?.startsWith("http")) {
      const dayNum = debrief.day_number;
      const label = dayNum != null ? `Day ${dayNum} — ${debrief.wave_label || "Session"}` : (debrief.wave_label || "Session");
      fetch(`/api/coach/students/${student.id}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: value,
          label,
          day_number: dayNum ?? null,
          kind: "session",
          debrief_id: debrief.id,
        }),
      }).catch(() => {});
    }
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

  function handleDayChange(val: string) {
    const clean = val.replace(/\D/g, "");
    setDayNumber(clean);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(async () => {
      await fetch(`/api/coach/debriefs/${debrief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_number: clean ? Number(clean) : null }),
      });
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
      {/* ── Row 1: Wave label + day + status ── */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          value={dayNumber}
          onChange={(e) => handleDayChange(e.target.value)}
          placeholder="Day"
          className="w-14 flex-shrink-0 rounded-xl px-2 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none text-center font-display tracking-wide"
          style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(224,182,79,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
        />
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

        {/* WhatsApp notify */}
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

      {/* ── Row 2: Tag + Cover toggle ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <TagPicker
          debriefId={debrief.id}
          currentTag={tag}
          onTagChange={setTag}
        />

        <button
          onClick={() => setCoverOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-display text-[10px] tracking-widest transition-all"
          style={
            coverImageUrl || colorIndex !== null
              ? { background: "rgba(176,119,212,0.12)", color: "#b077d4", border: "1px solid rgba(176,119,212,0.3)" }
              : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
          }
        >
          <span style={{ fontSize: 11 }}>🎨</span>
          Cover
          <span style={{ fontSize: 8, opacity: 0.6 }}>{coverOpen ? "▴" : "▾"}</span>
        </button>
      </div>

      {/* ── Cover customizer panel ── */}
      <AnimatePresence>
        {coverOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <CoverCustomizer
              debriefId={debrief.id}
              studentSlug={student.slug}
              colorIndex={colorIndex}
              imageUrl={coverImageUrl}
              onColorChange={setColorIndex}
              onImageChange={setCoverImageUrl}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Blocks ── */}
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
            <BlockEditor key={block.id} block={block} studentSlug={student.slug} studentName={student.full_name} onChange={handleBlockChange} />
          ))}
        </div>
      )}

      {/* ── Delete ── */}
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
