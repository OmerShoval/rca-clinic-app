"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/lib/language-context";

interface Debrief {
  id: string;
  wave_label: string;
  day_number: number | null;
  published_at: string | null;
  tag: string | null;
}

interface Props {
  slug: string;
  debriefs: Debrief[];
}

export function WavesList({ slug, debriefs }: Props) {
  const { t, lang, isRTL } = useLanguage();
  const allTags = Array.from(new Set(debriefs.map((d) => d.tag).filter(Boolean) as string[])).sort();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const visible = activeTag ? debriefs.filter((d) => d.tag === activeTag) : debriefs;

  const dateLocale = lang === "he" ? "he-IL" : "en-US";

  const debriefCountLabel =
    debriefs.length === 0
      ? t("waves_first_msg")
      : `${debriefs.length} ${debriefs.length !== 1 ? t("waves_from_coach") : t("waves_debrief_s")}`;

  return (
    <main className="flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-nav gap-6">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(47,214,192,0.05), transparent 65%)" }}
      />

      {/* Header */}
      <section>
        <p className="font-display text-teal text-[11px] tracking-[0.35em] mb-1">{t("waves_heading")}</p>
        <h1 className="font-display text-ink text-[clamp(32px,8vw,48px)] leading-none">
          {t("waves_your_sessions")}
        </h1>
        <p className="text-ink-dim text-sm mt-2">{debriefCountLabel}</p>
      </section>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex gap-2 flex-wrap"
        >
          <button
            onClick={() => setActiveTag(null)}
            className="rounded-full px-4 py-2.5 min-h-[40px] font-display text-[11px] tracking-[0.18em] transition-all"
            style={
              activeTag === null
                ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "var(--ink-faint)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {t("waves_all_filter")}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="rounded-full px-4 py-2.5 min-h-[40px] font-display text-[11px] tracking-[0.18em] transition-all"
              style={
                activeTag === tag
                  ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "var(--ink-faint)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {tag}
            </button>
          ))}
        </motion.div>
      )}

      {/* Debrief list */}
      <AnimatePresence mode="popLayout">
        {visible.length > 0 ? (
          <motion.div className="flex flex-col gap-3" layout>
            {visible.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                layout
              >
                <Link href={`/s/${slug}/waves/${d.id}`} className="block">
                  <div
                    className="rounded-2xl px-4 py-4 flex items-center gap-4 transition-opacity active:opacity-70"
                    style={{
                      background: "var(--glass)",
                      border: "1px solid var(--glass-edge)",
                      borderInlineStart: "3px solid var(--teal)",
                    }}
                  >
                    {/* Index number */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-display text-teal text-sm"
                      style={{ background: "var(--teal-soft)" }}
                    >
                      {visible.length - i}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm font-medium leading-snug">{d.wave_label}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {d.published_at && (
                          <p className="font-display text-[11px] tracking-widest text-ink-faint">
                            {new Date(d.published_at).toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                        {d.tag && (
                          <span
                            className="font-display text-[11px] tracking-widest rounded-full px-2 py-0.5"
                            style={{
                              background: "rgba(47,214,192,0.1)",
                              color: "var(--teal)",
                              border: "1px solid rgba(47,214,192,0.2)",
                            }}
                          >
                            {d.tag}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-ink-faint text-sm flex-shrink-0">
                      {isRTL ? "←" : "→"}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-8 text-center"
            style={{ border: "1.5px dashed var(--glass-edge)" }}
          >
            {debriefs.length === 0 ? (
              <>
                <p className="text-4xl mb-3">🏄</p>
                <p className="font-display text-ink text-xl mb-1">{t("waves_none_yet")}</p>
                <p className="text-ink-dim text-sm">{t("waves_check_back")}</p>
              </>
            ) : (
              <>
                <p className="font-display text-ink text-xl mb-1">{t("waves_none_in_clinic")}</p>
                <button onClick={() => setActiveTag(null)} className="text-teal text-sm mt-2">
                  {t("waves_show_all")}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
