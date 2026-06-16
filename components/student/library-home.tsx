"use client";

import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Book, BOOK_HEIGHTS } from "@/components/student/book";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Debrief {
  id: string;
  wave_label: string;
  day_number: number | null;
  published_at: string | null;
  tag: string | null;
  cover_color_index: number | null;
  cover_image_url: string | null;
}

interface LibraryHomeProps {
  slug: string;
  studentName: string;
  stage: number;
  focusSkill: string | null;
  debriefs: Debrief[];
  hasIsraelOcean: boolean;
  hasWavePool: boolean;
}

type SortMode = "all" | "by-clinic";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── GhostBook ────────────────────────────────────────────────────────────────

function GhostBook({ bi, delay }: { bi: number; delay: number }) {
  const reduce = useReducedMotion();
  const h = BOOK_HEIGHTS[bi % BOOK_HEIGHTS.length];
  return (
    <motion.div
      initial={reduce ? { opacity: 0.16 } : { opacity: 0 }}
      animate={{ opacity: 0.16 }}
      transition={{ delay, duration: 0.6 }}
      style={{ width: 88, height: h, alignSelf: "flex-end", flexShrink: 0 }}
    >
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          border: "1.5px dashed rgba(255,255,255,0.1)",
          borderRadius: 4,
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <span style={{ fontSize: 18, opacity: 0.4 }}>?</span>
      </div>
    </motion.div>
  );
}

// ─── ShelfSection ─────────────────────────────────────────────────────────────

function ShelfSection({
  title,
  count,
  shelfBg,
  sectionDelay,
  children,
}: {
  title: string;
  count: number;
  shelfBg: string;
  sectionDelay: number;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });

  return (
    <motion.section
      initial={reduce ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sectionDelay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-5 mb-3">
        <h2 className="font-display text-ink" style={{ fontSize: 17, letterSpacing: "0.05em" }}>
          {title}
        </h2>
        <div className="flex items-center gap-1.5">
          {count > 0 && (
            <span
              className="font-display"
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "rgba(241,238,230,0.38)",
                marginRight: 4,
              }}
            >
              {count}
            </span>
          )}
          <button
            onClick={() => scroll("left")}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-opacity active:opacity-100"
            style={{ border: "1px solid rgba(255,255,255,0.14)", opacity: 0.42, fontSize: 13 }}
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-opacity active:opacity-100"
            style={{ border: "1px solid rgba(255,255,255,0.14)", opacity: 0.42, fontSize: 13 }}
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      </div>

      {/* Books + shelf rail */}
      <div className="relative">
        {/* Edge fades */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10"
          style={{ background: "linear-gradient(to right, var(--abyss), transparent)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10"
          style={{ background: "linear-gradient(to left, var(--abyss), transparent)" }}
        />

        {/* Horizontal scroll */}
        <div ref={scrollRef} className="scrollbar-hide overflow-x-auto">
          <div
            className="flex gap-3 px-5"
            style={{ width: "max-content", alignItems: "flex-end", minHeight: 156 }}
          >
            {children}
          </div>
        </div>

        {/* Shelf rail */}
        <motion.div
          className="mx-4 relative"
          initial={reduce ? {} : { scaleX: 0, opacity: 0.5 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{
            delay: sectionDelay + 0.22,
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ transformOrigin: "left" }}
        >
          <div
            className="h-4 rounded-sm"
            style={{
              background: shelfBg,
              boxShadow: "0 4px 18px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04) inset",
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ left: 8, background: "rgba(255,255,255,0.13)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ right: 8, background: "rgba(255,255,255,0.13)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}

// Cycle through teal-toned shelf colours per clinic tag
const TAG_SHELF_BGRDS = [
  "linear-gradient(180deg, #1c3a34 0%, #0c2020 55%, #14302a 100%)",
  "linear-gradient(180deg, #1e2c3a 0%, #0c1820 55%, #14202a 100%)",
  "linear-gradient(180deg, #2e1c3a 0%, #1a0c20 55%, #221430 100%)",
  "linear-gradient(180deg, #3a2c1c 0%, #201800 55%, #2a2014 100%)",
  "linear-gradient(180deg, #1c3a1c 0%, #0c200c 55%, #14301a 100%)",
  "linear-gradient(180deg, #3a1c1c 0%, #200c0c 55%, #301414 100%)",
];

// ─── LibraryHome ─────────────────────────────────────────────────────────────

export function LibraryHome({
  slug,
  studentName,
  stage,
  focusSkill,
  debriefs,
  hasIsraelOcean,
  hasWavePool,
}: LibraryHomeProps) {
  const reduce = useReducedMotion();
  const firstName = studentName.split(" ")[0].toUpperCase();
  const planCount = (hasIsraelOcean ? 1 : 0) + (hasWavePool ? 1 : 0);
  const [sortMode, setSortMode] = useState<SortMode>("all");

  // Group debriefs by tag for "by-clinic" mode
  const tagGroups: { tag: string; items: Debrief[] }[] = [];
  const untagged: Debrief[] = [];
  if (sortMode === "by-clinic") {
    const map = new Map<string, Debrief[]>();
    for (const d of debriefs) {
      if (d.tag) {
        if (!map.has(d.tag)) map.set(d.tag, []);
        map.get(d.tag)!.push(d);
      } else {
        untagged.push(d);
      }
    }
    for (const [tag, items] of map) tagGroups.push({ tag, items });
    tagGroups.sort((a, b) => a.tag.localeCompare(b.tag));
  }

  const hasTags = debriefs.some((d) => d.tag);

  return (
    <main className="flex flex-col gap-8 pt-10 pb-6">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 800px 400px at 50% 0%, rgba(47,214,192,0.05), transparent 65%)",
        }}
      />

      {/* ── Library header ── */}
      <header className="px-5 flex flex-col gap-0.5">
        <motion.p
          initial={reduce ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-ink-faint"
          style={{ fontSize: 11, letterSpacing: "0.38em", textTransform: "uppercase" }}
        >
          my
        </motion.p>

        <motion.h1
          initial={reduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-ink leading-none"
          style={{ fontSize: "clamp(52px, 13vw, 76px)" }}
        >
          LIBRARY
        </motion.h1>

        {/* Name + stage bar */}
        <motion.div
          initial={reduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center gap-2 mt-1.5 flex-wrap"
        >
          <span className="font-display text-teal" style={{ fontSize: 11, letterSpacing: "0.25em" }}>
            {firstName}
          </span>
          <span className="text-ink-faint" style={{ fontSize: 10 }}>·</span>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 16,
                  height: 4,
                  background: i < stage ? "var(--teal)" : "rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>
          <span className="font-display text-ink-faint" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
            STAGE {stage}/5
          </span>
        </motion.div>

        {focusSkill && (
          <motion.p
            initial={reduce ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="text-ink-dim"
            style={{ fontSize: 12, marginTop: 2 }}
          >
            Focus: <span className="text-ink">{focusSkill}</span>
          </motion.p>
        )}

        {/* ── Sort controls (only shown when there are tags) ── */}
        {hasTags && (
          <motion.div
            initial={reduce ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.36, duration: 0.4 }}
            className="flex items-center gap-1.5 mt-3"
          >
            {(["all", "by-clinic"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className="rounded-full px-3 py-1 font-display text-[9px] tracking-[0.18em] transition-all"
                style={
                  sortMode === mode
                    ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.3)" }
                    : { background: "rgba(255,255,255,0.04)", color: "var(--ink-faint)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {mode === "all" ? "ALL WAVES" : "BY CLINIC"}
              </button>
            ))}
          </motion.div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {sortMode === "all" ? (
          <motion.div
            key="all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-8"
          >
            {/* ── Shelf: My Waves ── */}
            <ShelfSection
              title="My Waves"
              count={debriefs.length}
              shelfBg="linear-gradient(180deg, #1c3a34 0%, #0c2020 55%, #14302a 100%)"
              sectionDelay={0.15}
            >
              {debriefs.length > 0
                ? debriefs.map((d, i) => (
                    <Book
                      key={d.id}
                      href={`/s/${slug}/waves/${d.id}`}
                      title={d.wave_label}
                      footer={fmtDate(d.published_at)}
                      colorIndex={d.cover_color_index ?? i}
                      bookIndex={i}
                      delay={0.2 + i * 0.06}
                      coverImageUrl={d.cover_image_url}
                      tag={d.tag}
                    />
                  ))
                : [0, 1, 2].map((i) => (
                    <GhostBook key={i} bi={i} delay={0.22 + i * 0.07} />
                  ))}
            </ShelfSection>

            {/* ── Shelf: Personal Plan ── */}
            <ShelfSection
              title="Personal Plan"
              count={planCount}
              shelfBg="linear-gradient(180deg, #382600 0%, #1e1300 55%, #2c1e00 100%)"
              sectionDelay={0.3}
            >
              {hasIsraelOcean && (
                <Book
                  href={`/s/${slug}/home-base`}
                  title="ISRAEL OCEAN"
                  footer="HOME PLAN"
                  colorIndex={1}
                  bookIndex={0}
                  delay={0.38}
                />
              )}
              {hasWavePool && (
                <Book
                  href={`/s/${slug}/home-base`}
                  title="WAVE POOL"
                  footer="HOME PLAN"
                  colorIndex={4}
                  bookIndex={1}
                  delay={0.44}
                />
              )}
              {!hasIsraelOcean && !hasWavePool && (
                <>
                  <GhostBook bi={0} delay={0.35} />
                  <GhostBook bi={1} delay={0.42} />
                </>
              )}
            </ShelfSection>

            {/* ── Shelf: Coming Soon ── */}
            <ShelfSection
              title="Coming Soon"
              count={0}
              shelfBg="linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 55%, #141414 100%)"
              sectionDelay={0.45}
            >
              {[0, 1, 2, 3].map((i) => (
                <GhostBook key={i} bi={i + 2} delay={0.5 + i * 0.055} />
              ))}
            </ShelfSection>
          </motion.div>
        ) : (
          /* ── By Clinic mode ── */
          <motion.div
            key="by-clinic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-8"
          >
            {tagGroups.map(({ tag, items }, gi) => (
              <ShelfSection
                key={tag}
                title={tag}
                count={items.length}
                shelfBg={TAG_SHELF_BGRDS[gi % TAG_SHELF_BGRDS.length]}
                sectionDelay={0.08 * gi}
              >
                {items.map((d, i) => (
                  <Book
                    key={d.id}
                    href={`/s/${slug}/waves/${d.id}`}
                    title={d.wave_label}
                    footer={fmtDate(d.published_at)}
                    colorIndex={d.cover_color_index ?? i}
                    bookIndex={i}
                    delay={0.1 + i * 0.06}
                    coverImageUrl={d.cover_image_url}
                    tag={null}
                  />
                ))}
              </ShelfSection>
            ))}

            {/* Untagged waves — shown under "Other" if any */}
            {untagged.length > 0 && (
              <ShelfSection
                title="Other Waves"
                count={untagged.length}
                shelfBg="linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 55%, #141414 100%)"
                sectionDelay={0.08 * tagGroups.length}
              >
                {untagged.map((d, i) => (
                  <Book
                    key={d.id}
                    href={`/s/${slug}/waves/${d.id}`}
                    title={d.wave_label}
                    footer={fmtDate(d.published_at)}
                    colorIndex={d.cover_color_index ?? i}
                    bookIndex={i}
                    delay={0.1 + i * 0.06}
                    coverImageUrl={d.cover_image_url}
                    tag={null}
                  />
                ))}
              </ShelfSection>
            )}

            {tagGroups.length === 0 && untagged.length === 0 && (
              <div className="px-5">
                <p className="text-ink-faint text-sm">No waves yet.</p>
              </div>
            )}

            {/* Personal Plan always visible below clinic shelves */}
            <ShelfSection
              title="Personal Plan"
              count={planCount}
              shelfBg="linear-gradient(180deg, #382600 0%, #1e1300 55%, #2c1e00 100%)"
              sectionDelay={0.08 * (tagGroups.length + 1)}
            >
              {hasIsraelOcean && (
                <Book
                  href={`/s/${slug}/home-base`}
                  title="ISRAEL OCEAN"
                  footer="HOME PLAN"
                  colorIndex={1}
                  bookIndex={0}
                  delay={0.15}
                />
              )}
              {hasWavePool && (
                <Book
                  href={`/s/${slug}/home-base`}
                  title="WAVE POOL"
                  footer="HOME PLAN"
                  colorIndex={4}
                  bookIndex={1}
                  delay={0.22}
                />
              )}
              {!hasIsraelOcean && !hasWavePool && (
                <>
                  <GhostBook bi={0} delay={0.15} />
                  <GhostBook bi={1} delay={0.22} />
                </>
              )}
            </ShelfSection>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
