"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { VideoSlot } from "@/components/ui/video-slot";
import type { DebriefBlock } from "@/lib/database.types";

// ─── Palettes — must match library-home.tsx exactly ──────────────────────────

const PALETTES = [
  { gradient: "linear-gradient(160deg,#0c3028 0%,#071a15 100%)", accent: "#2fd6c0", rgb: "47,214,192" },
  { gradient: "linear-gradient(160deg,#2d1b00 0%,#170e00 100%)", accent: "#e0b64f", rgb: "224,182,79" },
  { gradient: "linear-gradient(160deg,#2e0d0a 0%,#190705 100%)", accent: "#ff6b5e", rgb: "255,107,94" },
  { gradient: "linear-gradient(160deg,#0a1a2e 0%,#060f1a 100%)", accent: "#6baed6", rgb: "107,174,214" },
  { gradient: "linear-gradient(160deg,#1c0a2e 0%,#0f0618 100%)", accent: "#b077d4", rgb: "176,119,212" },
  { gradient: "linear-gradient(160deg,#0a2d10 0%,#061807 100%)", accent: "#4ecb71", rgb: "78,203,113" },
];

// ─── Block type semantic config ───────────────────────────────────────────────

const BLOCK_META: Record<
  DebriefBlock["type"],
  { label: string; color: string; bg: string; icon: string; caption: string }
> = {
  mistake:     { label: "The Mistake",     color: "#ff6b5e", bg: "rgba(255,107,94,0.09)",  icon: "⚡", caption: "What went wrong" },
  correction:  { label: "The Correction",  color: "#2fd6c0", bg: "rgba(47,214,192,0.09)",  icon: "✦",  caption: "What to do instead" },
  improvement: { label: "The Improvement", color: "#2fd6c0", bg: "rgba(47,214,192,0.09)",  icon: "↑",  caption: "How far you've come" },
  goal:        { label: "The Goal",        color: "#e0b64f", bg: "rgba(224,182,79,0.10)",  icon: "◎",  caption: "Where you're headed" },
  next_step:   { label: "Next Step",       color: "#e0b64f", bg: "rgba(224,182,79,0.10)",  icon: "→",  caption: "Your next focus" },
};

const TYPE_ORDER: DebriefBlock["type"][] = ["mistake", "correction", "improvement", "goal", "next_step"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DebriefMeta {
  id: string;
  wave_label: string;
  day_number: number | null;
  published_at: string | null;
}

interface Props {
  slug: string;
  debrief: DebriefMeta;
  blocks: DebriefBlock[];
  paletteIndex: number;
}

// ─── ChapterDivider ──────────────────────────────────────────────────────────

function ChapterDivider({
  label,
  caption,
  icon,
  color,
  delay,
}: {
  label: string;
  caption: string;
  icon: string;
  color: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-1.5 pt-6 pb-4"
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
      <span
        className="font-display"
        style={{ fontSize: 11, letterSpacing: "0.32em", color, marginTop: 4 }}
      >
        {label.toUpperCase()}
      </span>
      <span
        style={{ fontSize: 10, color: "rgba(241,238,230,0.32)", letterSpacing: "0.08em" }}
      >
        {caption}
      </span>
      <div className="flex items-center w-full mt-1.5">
        <div
          className="h-px flex-1"
          style={{ background: `linear-gradient(to right, transparent, ${color}55)` }}
        />
        <div
          className="mx-3 rounded-full"
          style={{ width: 4, height: 4, background: `${color}88` }}
        />
        <div
          className="h-px flex-1"
          style={{ background: `linear-gradient(to left, transparent, ${color}55)` }}
        />
      </div>
    </motion.div>
  );
}

// ─── BlockCard ────────────────────────────────────────────────────────────────

function BlockCard({
  block,
  bookAccent,
  delay,
}: {
  block: DebriefBlock;
  bookAccent: string;
  delay: number;
}) {
  const meta = BLOCK_META[block.type];
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.042)",
        border: `1px solid ${meta.color}1e`,
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
        {/* Type badge */}
        <span
          className="font-display self-start px-2.5 py-1 rounded-lg"
          style={{
            fontSize: 8,
            letterSpacing: "0.22em",
            color: meta.color,
            background: meta.bg,
          }}
        >
          {meta.label.toUpperCase()}
        </span>

        {/* Title */}
        {block.title && (
          <h3
            className="text-ink font-semibold leading-snug"
            style={{ fontSize: 17 }}
          >
            {block.title}
          </h3>
        )}

        {/* Body */}
        {block.body && (
          <p
            className="text-ink-dim whitespace-pre-wrap"
            style={{ fontSize: 14, lineHeight: 1.7 }}
          >
            {block.body}
          </p>
        )}

        {/* Felt sense quote */}
        {block.felt_sense_quote && (
          <blockquote
            className="italic"
            style={{
              fontSize: 13,
              color: meta.color,
              padding: "10px 14px",
              background: meta.bg,
              borderLeft: `2px solid ${meta.color}66`,
              borderRadius: 10,
              lineHeight: 1.65,
            }}
          >
            &ldquo;{block.felt_sense_quote}&rdquo;
          </blockquote>
        )}

        {/* Metadata chips */}
        {(block.where_on_wave || block.timestamp_marker || block.why_it_happened) && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {block.where_on_wave && (
              <span
                className="font-display px-2.5 py-1 rounded-full"
                style={{
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  color: "rgba(241,238,230,0.42)",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                📍 {block.where_on_wave}
              </span>
            )}
            {block.timestamp_marker && (
              <span
                className="font-display px-2.5 py-1 rounded-full"
                style={{
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  color: "rgba(241,238,230,0.42)",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                ⏱ {block.timestamp_marker}
              </span>
            )}
            {block.why_it_happened && (
              <p
                className="w-full"
                style={{ fontSize: 12, color: "rgba(241,238,230,0.36)", lineHeight: 1.55 }}
              >
                {block.why_it_happened}
              </p>
            )}
          </div>
        )}

        {/* Book-colored accent line before videos */}
        {(block.video_url || block.video_url_secondary) && (
          <div
            className="h-px"
            style={{
              background: `linear-gradient(to right, ${bookAccent}2e, transparent)`,
            }}
          />
        )}

        {/* Videos */}
        {block.video_url && (
          <VideoSlot
            url={block.video_url}
            label={
              block.type === "improvement"
                ? "Before"
                : block.type === "goal"
                ? "Goal video"
                : block.type === "next_step"
                ? "Drill video"
                : "Watch clip"
            }
          />
        )}
        {block.video_url_secondary && (
          <VideoSlot
            url={block.video_url_secondary}
            label={block.type === "improvement" ? "After" : "Reference wave"}
          />
        )}
      </div>
    </motion.div>
  );
}

// ─── NotesSection ─────────────────────────────────────────────────────────────

function NotesSection({
  debriefId,
  accent,
  rgb,
}: {
  debriefId: string;
  accent: string;
  rgb: string;
}) {
  const [note, setNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const stored = localStorage.getItem(`oa_notes_${debriefId}`);
    if (stored) {
      setNote(stored);
      setDraft(stored);
    }
  }, [debriefId]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [isEditing]);

  const save = () => {
    localStorage.setItem(`oa_notes_${debriefId}`, draft);
    setNote(draft);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const cancel = () => {
    setDraft(note);
    setIsEditing(false);
  };

  return (
    <motion.section
      initial={reduce ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="px-5 mt-2 mb-4"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="h-px flex-1"
          style={{ background: `linear-gradient(to right, transparent, ${accent}44)` }}
        />
        <span
          className="font-display"
          style={{ fontSize: 9, letterSpacing: "0.32em", color: accent }}
        >
          YOUR NOTES
        </span>
        <div
          className="h-px flex-1"
          style={{ background: `linear-gradient(to left, transparent, ${accent}44)` }}
        />
      </div>

      {/* Sticky note card */}
      <div
        className="rounded-2xl p-4 relative"
        style={{
          background: `rgba(${rgb}, 0.07)`,
          border: `1px solid rgba(${rgb}, 0.22)`,
          minHeight: 108,
        }}
      >
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                placeholder="Write your thoughts, feelings, or observations from this session…"
                className="w-full bg-transparent resize-none outline-none text-ink"
                style={{ fontSize: 14, minHeight: 80, lineHeight: 1.68 }}
              />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={cancel}
                  className="font-display px-3 py-1.5 rounded-xl"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    color: "rgba(241,238,230,0.45)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={save}
                  className="font-display px-4 py-1.5 rounded-xl"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    color: "#070f15",
                    background: accent,
                  }}
                >
                  SAVE NOTE
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="viewing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsEditing(true)}
              className="cursor-text"
            >
              {note ? (
                <p
                  className="text-ink whitespace-pre-wrap"
                  style={{ fontSize: 14, lineHeight: 1.68 }}
                >
                  {note}
                </p>
              ) : (
                <p
                  className="italic"
                  style={{
                    fontSize: 14,
                    color: `rgba(${rgb}, 0.42)`,
                    lineHeight: 1.68,
                  }}
                >
                  Tap to add your personal notes from this session…
                </p>
              )}
              <div className="flex justify-end mt-3">
                <span
                  className="font-display"
                  style={{
                    fontSize: 8,
                    letterSpacing: "0.18em",
                    color: `rgba(${rgb}, 0.48)`,
                  }}
                >
                  {note ? "TAP TO EDIT ✏" : "+ ADD NOTE"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Saved confirmation */}
      <AnimatePresence>
        {saved && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="font-display text-center mt-2"
            style={{ fontSize: 9, letterSpacing: "0.25em", color: accent }}
          >
            ✓ NOTE SAVED
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// ─── DebriefDetailClient ──────────────────────────────────────────────────────

export function DebriefDetailClient({ slug, debrief, blocks, paletteIndex }: Props) {
  const pal = PALETTES[paletteIndex % PALETTES.length];
  const reduce = useReducedMotion();

  const filledBlocks = blocks.filter((b) => b.title || b.body);

  const grouped = TYPE_ORDER.reduce<Record<string, DebriefBlock[]>>((acc, type) => {
    const typed = filledBlocks.filter((b) => b.type === type);
    if (typed.length > 0) acc[type] = typed;
    return acc;
  }, {});

  const presentTypes = TYPE_ORDER.filter((t) => grouped[t]);
  const totalEntries = filledBlocks.length;

  return (
    <div className="flex flex-col">

      {/* ══ BOOK HEADER ══════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden" style={{ minHeight: 236 }}>
        {/* Book gradient */}
        <div className="absolute inset-0" style={{ background: pal.gradient }} />

        {/* Top accent stripe */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 2, background: pal.accent }}
        />

        {/* Left spine */}
        <div
          className="absolute top-0 left-0 bottom-0"
          style={{
            width: 3,
            background: `linear-gradient(to bottom, ${pal.accent}, ${pal.accent}44, transparent)`,
          }}
        />

        {/* ← LIBRARY back button */}
        <motion.div
          className="absolute"
          style={{ top: 48, left: 18 }}
          initial={reduce ? {} : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32 }}
        >
          <Link
            href={`/s/${slug}`}
            className="flex items-center gap-1.5 transition-opacity active:opacity-55"
            style={{ color: pal.accent }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>←</span>
            <span className="font-display" style={{ fontSize: 9, letterSpacing: "0.26em" }}>
              LIBRARY
            </span>
          </Link>
        </motion.div>

        {/* Entry count — top right */}
        {totalEntries > 0 && (
          <motion.div
            className="absolute"
            style={{ top: 50, right: 20 }}
            initial={reduce ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <span
              className="font-display"
              style={{ fontSize: 9, letterSpacing: "0.2em", color: `rgba(${pal.rgb}, 0.48)` }}
            >
              {totalEntries} {totalEntries === 1 ? "ENTRY" : "ENTRIES"}
            </span>
          </motion.div>
        )}

        {/* Wave label + date */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-12 pl-7">
          {debrief.day_number != null && (
            <motion.p
              className="font-display"
              style={{
                fontSize: 9,
                letterSpacing: "0.36em",
                color: `rgba(${pal.rgb}, 0.6)`,
                marginBottom: 6,
              }}
              initial={reduce ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.32 }}
            >
              DAY {debrief.day_number}
            </motion.p>
          )}
          <motion.h1
            className="font-display text-ink leading-none"
            style={{ fontSize: "clamp(28px,8vw,50px)" }}
            initial={reduce ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {debrief.wave_label}
          </motion.h1>
          {debrief.published_at && (
            <motion.p
              className="font-display"
              style={{
                fontSize: 9,
                letterSpacing: "0.22em",
                color: `rgba(${pal.rgb}, 0.48)`,
                marginTop: 10,
              }}
              initial={reduce ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.32 }}
            >
              {new Date(debrief.published_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </motion.p>
          )}
        </div>

        {/* Fade to abyss */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 48,
            background: "linear-gradient(to bottom, transparent, var(--abyss))",
          }}
        />
      </header>

      {/* ══ CHAPTER PILLS ════════════════════════════════════════════════════ */}
      {presentTypes.length > 0 && (
        <motion.div
          initial={reduce ? {} : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.28, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-x-auto scrollbar-hide px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex gap-2" style={{ width: "max-content" }}>
            {presentTypes.map((type) => {
              const meta = BLOCK_META[type];
              return (
                <a key={type} href={`#section-${type}`} className="flex-shrink-0">
                  <span
                    className="font-display flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      fontSize: 8,
                      letterSpacing: "0.18em",
                      color: meta.color,
                      background: meta.bg,
                      border: `1px solid ${meta.color}30`,
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{meta.icon}</span>
                    {meta.label.toUpperCase()}
                  </span>
                </a>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ══ BLOCK SECTIONS ═══════════════════════════════════════════════════ */}
      {presentTypes.length > 0 ? (
        <div className="flex flex-col pt-1 pb-2">
          {presentTypes.map((type, ti) => {
            const meta = BLOCK_META[type];
            const typeBlocks = grouped[type];
            return (
              <section
                key={type}
                id={`section-${type}`}
                className="flex flex-col gap-3 px-5 mb-3"
              >
                <ChapterDivider
                  label={meta.label}
                  caption={meta.caption}
                  icon={meta.icon}
                  color={meta.color}
                  delay={0.3 + ti * 0.06}
                />
                {typeBlocks.map((block, bi) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    bookAccent={pal.accent}
                    delay={0.35 + ti * 0.06 + bi * 0.05}
                  />
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={reduce ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mx-5 mt-8 rounded-2xl p-8 text-center"
          style={{ border: "1.5px dashed var(--glass-edge)" }}
        >
          <p className="text-4xl mb-3">🌊</p>
          <p className="font-display text-ink mb-1" style={{ fontSize: 18 }}>
            Content coming soon
          </p>
          <p className="text-ink-dim text-sm">Omer is still writing up your debrief</p>
        </motion.div>
      )}

      {/* ══ PERSONAL NOTES ═══════════════════════════════════════════════════ */}
      <div
        className="mt-4 pt-2 mx-5 mb-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <NotesSection
          debriefId={debrief.id}
          accent={pal.accent}
          rgb={pal.rgb}
        />
      </div>
    </div>
  );
}
