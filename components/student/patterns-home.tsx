"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { PatternPath } from "@/lib/patterns";
import { useLanguage } from "@/lib/language-context";

interface PatternsHomeProps {
  slug: string;
  studentName: string;
  paths: PatternPath[];
}

function progressColor(path: PatternPath) {
  if (path.totalCount === 0) return "rgba(139,92,246,0.7)";
  if (path.doneCount === path.totalCount) return "var(--teal)";
  if (path.doneCount > 0) return "var(--coral)";
  return "rgba(139,92,246,0.7)";
}

function borderColor(path: PatternPath) {
  if (path.totalCount === 0) return "rgba(139,92,246,0.25)";
  if (path.doneCount === path.totalCount) return "rgba(47,214,192,0.3)";
  if (path.doneCount > 0) return "rgba(255,107,94,0.3)";
  return "rgba(139,92,246,0.25)";
}

function bgColor(path: PatternPath) {
  if (path.totalCount === 0) return "rgba(139,92,246,0.06)";
  if (path.doneCount === path.totalCount) return "rgba(47,214,192,0.06)";
  if (path.doneCount > 0) return "rgba(255,107,94,0.06)";
  return "rgba(139,92,246,0.06)";
}

export function PatternsHome({ slug, studentName, paths }: PatternsHomeProps) {
  const reduce = useReducedMotion();
  const { t } = useLanguage();
  const firstName = studentName.split(" ")[0].toUpperCase();

  return (
    <main className="flex flex-col pb-28 pt-10">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(139,92,246,0.07), transparent 65%)",
        }}
      />

      {/* Header */}
      <header className="px-5 mb-8">
        <motion.p
          initial={reduce ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-ink-faint"
          style={{ fontSize: 11, letterSpacing: "0.38em", textTransform: "uppercase" }}
        >
          {firstName}
        </motion.p>
        <motion.h1
          initial={reduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-ink leading-none"
          style={{ fontSize: "clamp(52px, 13vw, 72px)" }}
        >
          {t("strat_heading")}
        </motion.h1>
        <motion.p
          initial={reduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-ink-faint mt-2"
          style={{ fontSize: 13 }}
        >
          {t("strat_subtitle")}
        </motion.p>
      </header>

      {/* Empty state */}
      {paths.length === 0 && (
        <motion.div
          initial={reduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center py-20 px-5 text-center gap-3"
        >
          <span style={{ fontSize: 56 }}>🗺</span>
          <p className="font-display text-ink" style={{ fontSize: 22 }}>
            {t("strat_empty")}
          </p>
        </motion.div>
      )}

      {/* Path cards */}
      <div className="flex flex-col gap-4 px-5">
        {paths.map((path, i) => {
          const pct =
            path.totalCount > 0
              ? Math.round((path.doneCount / path.totalCount) * 100)
              : 0;
          const nextStep = path.steps.find((s) => s.status === "active");
          const allDone = path.totalCount > 0 && path.doneCount === path.totalCount;

          return (
            <motion.div
              key={path.id}
              initial={reduce ? {} : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.18 + i * 0.09,
                duration: 0.42,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link
                href={`/s/${slug}/patterns/${path.id}`}
                className="flex flex-col gap-3 rounded-2xl px-5 py-4 transition-opacity active:opacity-70"
                style={{
                  background: bgColor(path),
                  border: `1.5px solid ${borderColor(path)}`,
                }}
              >
                {/* Eyebrow */}
                <div className="flex items-center justify-between">
                  <p
                    className="font-display text-[9px] tracking-[0.28em]"
                    style={{ color: progressColor(path) }}
                  >
                    PATTERN {i + 1}
                  </p>
                  {allDone && (
                    <span
                      className="font-display text-[8px] tracking-[0.2em] px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(47,214,192,0.15)",
                        color: "var(--teal)",
                        border: "1px solid rgba(47,214,192,0.3)",
                      }}
                    >
                      COMPLETE
                    </span>
                  )}
                </div>

                {/* Title */}
                <p
                  className="font-display text-ink leading-none"
                  style={{ fontSize: "clamp(28px, 7vw, 38px)" }}
                >
                  {path.title}
                </p>

                {/* Progress bar */}
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${progressColor(path)}88, ${progressColor(path)})`,
                      boxShadow: `0 0 10px ${progressColor(path)}55`,
                    }}
                  />
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <p
                    className="font-display text-[10px] tracking-[0.15em]"
                    style={{ color: "rgba(241,238,230,0.45)" }}
                  >
                    {path.doneCount} of {path.totalCount} steps
                  </p>
                  {nextStep && (
                    <p
                      className="text-[11px] font-medium truncate max-w-[160px]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {nextStep.title} · up next
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
