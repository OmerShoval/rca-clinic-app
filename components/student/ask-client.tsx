"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VideoSlot } from "@/components/ui/video-slot";
import { useLanguage } from "@/lib/language-context";
import type { Thread } from "@/lib/database.types";

interface Props {
  initialThreads: Thread[];
}

export function AskClient({ initialThreads }: Props) {
  const { t } = useLanguage();
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [question, setQuestion] = useState("");
  const [clipUrl, setClipUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const statusMeta = {
    new:       { labelKey: "ask_status_new",    color: "var(--coral)", bg: "var(--coral-soft)" },
    in_review: { labelKey: "ask_status_review", color: "var(--gold)",  bg: "var(--gold-soft)"  },
    answered:  { labelKey: "ask_status_done",   color: "var(--teal)",  bg: "var(--teal-soft)"  },
  } as const;

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_text: question, clip_url: clipUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      setThreads((prev) => [data, ...prev]);
      setQuestion("");
      setClipUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Submit form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
      >
        <label className="font-display text-[10px] tracking-[0.25em] text-coral">
          {t("ask_form_label")}
        </label>
        <textarea
          ref={textRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("ask_placeholder")}
          rows={4}
          required
          className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none resize-none"
          style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,107,94,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
        />

        {/* Clip URL */}
        <div>
          <label className="font-display text-[9px] tracking-[0.2em] text-ink-faint block mb-1.5">
            {t("ask_clip_label")}
          </label>
          <input
            type="url"
            value={clipUrl}
            onChange={(e) => setClipUrl(e.target.value)}
            placeholder={t("ask_clip_ph")}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
            style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
          />
          {clipUrl && (
            <div className="mt-2">
              <VideoSlot url={clipUrl} label={t("ask_your_clip")} />
            </div>
          )}
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !question.trim()}
          className="w-full py-3 rounded-2xl font-display text-[13px] tracking-widest text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--coral)" }}
        >
          {submitting ? t("ask_sending") : t("ask_btn")}
        </button>
      </form>

      {/* Past threads */}
      {threads.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-display text-[10px] tracking-[0.25em] text-ink-faint px-1">
            {t("ask_your_qs")}
          </p>
          {threads.map((thread) => {
            const sm = statusMeta[thread.status];
            const isOpen = expandedId === thread.id;
            return (
              <div key={thread.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : thread.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
                  style={{
                    background: "var(--glass)",
                    border: "1px solid var(--glass-edge)",
                    borderInlineStart: `3px solid ${sm.color}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm leading-snug line-clamp-2">{thread.question_text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="font-display text-[9px] tracking-widest px-2 py-0.5 rounded"
                        style={{ color: sm.color, background: sm.bg }}
                      >
                        {t(sm.labelKey).toUpperCase()}
                      </span>
                      <span className="font-display text-[9px] tracking-widest text-ink-faint">
                        {new Date(thread.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-ink-faint text-xs flex-shrink-0 mt-1"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  >
                    ▾
                  </span>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        className="px-4 py-4 flex flex-col gap-3 rounded-b-2xl"
                        style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)", borderTop: "none" }}
                      >
                        <p className="text-ink-dim text-sm leading-relaxed">{thread.question_text}</p>

                        {thread.clip_url && (
                          <VideoSlot url={thread.clip_url} label={t("ask_your_clip")} />
                        )}

                        {/* Reply */}
                        {thread.status === "answered" && (
                          <div
                            className="rounded-xl px-4 py-3"
                            style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
                          >
                            <p className="font-display text-[10px] tracking-[0.2em] text-teal mb-2">
                              {t("ask_omers_reply")}
                            </p>
                            {thread.reply_type === "whatsapp" ? (
                              <p className="text-ink-dim text-sm">{t("ask_reply_wa")}</p>
                            ) : thread.reply_url ? (
                              <VideoSlot url={thread.reply_url} label={t("ask_watch_reply")} />
                            ) : (
                              <p className="text-ink-dim text-sm">{t("ask_reply_soon")}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {threads.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ border: "1.5px dashed var(--glass-edge)" }}
        >
          <p className="text-ink-faint text-sm">{t("ask_empty")}</p>
        </div>
      )}
    </div>
  );
}
