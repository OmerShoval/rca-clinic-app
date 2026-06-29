"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VideoUploader } from "@/components/coach/video-uploader";
import type { DebriefBlock } from "@/lib/database.types";

type BlockType = DebriefBlock["type"];

const META: Record<BlockType, { label: string; color: string; bg: string; border: string; emoji: string; hint: string }> = {
  mistake:     { label: "Mistake",     color: "var(--coral)", bg: "var(--coral-soft)", border: "rgba(255,107,94,0.3)",   emoji: "⚡", hint: "What went wrong on this wave?" },
  correction:  { label: "Correction",  color: "var(--teal)",  bg: "var(--teal-soft)",  border: "rgba(47,214,192,0.3)",   emoji: "↗", hint: "What's the fix?" },
  improvement: { label: "Improvement", color: "var(--teal)",  bg: "var(--teal-soft)",  border: "rgba(47,214,192,0.25)",  emoji: "✦", hint: "What got noticeably better?" },
  goal:        { label: "Goal",        color: "var(--gold)",  bg: "var(--gold-soft)",  border: "rgba(224,182,79,0.3)",   emoji: "◎", hint: "What's the target for next session?" },
  next_step:   { label: "Next Step",   color: "var(--gold)",  bg: "var(--gold-soft)",  border: "rgba(224,182,79,0.25)",  emoji: "→", hint: "One concrete action before next session" },
};

const BLOCK_FIELDS: Record<BlockType, string[]> = {
  mistake:     ["title", "body", "felt_sense_quote", "where_on_wave", "why_it_happened", "timestamp_marker", "video_url"],
  correction:  ["title", "body", "felt_sense_quote", "video_url", "video_url_secondary"],
  improvement: ["title", "body", "video_url", "video_url_secondary"],
  goal:        ["title", "body", "video_url"],
  next_step:   ["title", "body", "video_url"],
};

const BLOCK_FIELD_LABELS: Partial<Record<BlockType, Partial<Record<string, string>>>> = {
  mistake:     { title: "What Happened", body: "Full Breakdown", video_url: "Wave Clip" },
  correction:  { title: "The Fix (one line)", felt_sense_quote: "\"It Feels Like…\" (teal quote)", video_url: "First-Person View (FPV)", video_url_secondary: "Third-Person View (land/water angle)" },
  improvement: { title: "What Improved", video_url: "Before Clip", video_url_secondary: "After Clip" },
  goal:        { title: "Goal (one line)", video_url: "Goal Video" },
  next_step:   { title: "Next Step (one line)", video_url: "Next Step Video" },
};

const FIELD_META: Record<string, { label: string; placeholder: string; multiline: boolean }> = {
  title:            { label: "Headline",     placeholder: "Short, punchy summary…",       multiline: false },
  body:             { label: "Detail",        placeholder: "Explain in depth…",            multiline: true  },
  felt_sense_quote: { label: "Felt Sense",    placeholder: "\"It felt like…\"",           multiline: false },
  where_on_wave:    { label: "Where on Wave", placeholder: "Take-off, bottom turn, lip…", multiline: false },
  why_it_happened:  { label: "Root Cause",    placeholder: "Why did this happen?",         multiline: false },
  timestamp_marker: { label: "Timestamp",     placeholder: "e.g. 0:42",                   multiline: false },
};

const VIDEO_FIELDS = new Set(["video_url", "video_url_secondary"]);

interface Props {
  block: DebriefBlock;
  studentSlug: string;
  studentName: string;
  studentId?: string;
  debriefId?: string;
  debriefLabel?: string;
  debriefDayNum?: number | null;
  onChange: (id: string, field: string, value: string) => void;
}

export function BlockEditor({ block, studentSlug, studentName, studentId, debriefId, debriefLabel, debriefDayNum, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const meta = META[block.type];
  const fields = BLOCK_FIELDS[block.type];

  const hasContent = fields.some((f) => !!(block as Record<string, unknown>)[f]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${meta.border}`, background: "var(--depth)" }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90"
        style={{ background: open ? meta.bg : "transparent" }}
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[13px] tracking-widest" style={{ color: meta.color }}>
            {meta.label}
          </p>
          {!open && block.title && (
            <p className="text-ink-dim text-xs truncate mt-0.5">{block.title}</p>
          )}
          {!open && !block.title && (
            <p className="text-ink-faint text-xs mt-0.5">{meta.hint}</p>
          )}
        </div>
        {hasContent && (
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
        )}
        <span className="text-ink-faint text-xs flex-shrink-0" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>

      {/* Fields */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="fields"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 pt-2 flex flex-col gap-3" style={{ borderTop: `1px solid ${meta.border}` }}>
              {fields.map((field) => {
                const label = BLOCK_FIELD_LABELS[block.type]?.[field] ?? FIELD_META[field]?.label ?? field;
                const value = ((block as Record<string, unknown>)[field] as string) ?? "";

                if (VIDEO_FIELDS.has(field)) {
                  return (
                    <VideoUploader
                      key={field}
                      label={label}
                      studentSlug={studentSlug}
                      studentName={studentName}
                      studentId={studentId}
                      debriefId={debriefId}
                      debriefLabel={debriefLabel}
                      debriefDayNum={debriefDayNum}
                      value={value}
                      accentColor={meta.color}
                      accentBg={meta.bg}
                      accentBorder={meta.border}
                      onChange={(url) => onChange(block.id, field, url)}
                    />
                  );
                }

                const fm = FIELD_META[field];
                return (
                  <div key={field}>
                    <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1">
                      {label}
                    </label>
                    {fm.multiline ? (
                      <textarea
                        value={value}
                        onChange={(e) => onChange(block.id, field, e.target.value)}
                        placeholder={fm.placeholder}
                        rows={3}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none resize-none transition-colors"
                        style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(block.id, field, e.target.value)}
                        placeholder={fm.placeholder}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors"
                        style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
