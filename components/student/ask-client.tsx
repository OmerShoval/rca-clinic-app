"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VideoSlot } from "@/components/ui/video-slot";
import { useLanguage } from "@/lib/language-context";
import { uploadStudentClip } from "@/lib/upload-client";
import type { Abortable } from "@/lib/upload-client";
import type { Thread } from "@/lib/database.types";

interface Props {
  initialThreads: Thread[];
}

const ACCEPTED_CLIP_TYPES = "video/mp4,video/webm,video/quicktime,image/gif";

export function AskClient({ initialThreads }: Props) {
  const { t } = useLanguage();
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [question, setQuestion] = useState("");
  const [clipUrl, setClipUrl] = useState("");
  const [clipTab, setClipTab] = useState<"upload" | "paste">("upload");
  const [pasteClip, setPasteClip] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const uploadRef = useRef<Abortable | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusMeta = {
    new:       { labelKey: "ask_status_new",    color: "var(--coral)", bg: "var(--coral-soft)" },
    in_review: { labelKey: "ask_status_review", color: "var(--gold)",  bg: "var(--gold-soft)"  },
    answered:  { labelKey: "ask_status_done",   color: "var(--teal)",  bg: "var(--teal-soft)"  },
  } as const;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadState("uploading");
    setUploadProgress(0);

    uploadStudentClip({
      file,
      onProgress: setUploadProgress,
      uploadRef,
    })
      .then((url) => {
        setClipUrl(url);
        setUploadState("done");
      })
      .catch((err: Error) => {
        if (err.message === "cancelled") {
          setUploadState("idle");
          setUploadProgress(0);
        } else {
          setUploadError(err.message);
          setUploadState("idle");
        }
      });

    // Reset input so the same file can be re-selected after cancel
    e.target.value = "";
  }

  function cancelUpload() {
    uploadRef.current?.abort();
    setUploadState("idle");
    setUploadProgress(0);
  }

  function clearClip() {
    setClipUrl("");
    setUploadState("idle");
    setUploadProgress(0);
    setUploadError(null);
    setPasteClip("");
  }

  function handlePasteClip(v: string) {
    setPasteClip(v);
    setClipUrl(v);
  }

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
      clearClip();
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

        {/* Clip — Upload or Paste */}
        <div className="flex flex-col gap-2">
          <p className="font-display text-[9px] tracking-[0.2em] text-ink-faint">
            {t("ask_clip_label")}
          </p>

          {/* Tab switcher */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--glass-edge)" }}>
            {(["upload", "paste"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setClipTab(tab); clearClip(); }}
                className="flex-1 py-3 font-display text-[11px] tracking-widest transition-colors"
                style={clipTab === tab
                  ? { background: "var(--coral-soft)", color: "var(--coral)", borderInlineEnd: tab === "upload" ? "1px solid rgba(255,107,94,0.3)" : undefined }
                  : { background: "transparent", color: "var(--ink-faint)", borderInlineEnd: tab === "upload" ? "1px solid var(--glass-edge)" : undefined }
                }
              >
                {tab === "upload" ? "Upload Clip" : "Paste Link"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {clipTab === "upload" ? (
              <motion.div key="upload" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_CLIP_TYPES}
                  className="hidden"
                  onChange={handleFileChange}
                />

                {uploadState === "idle" && !clipUrl && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-4 transition-opacity hover:opacity-80"
                    style={{ border: "1.5px dashed var(--glass-edge)", background: "var(--depth)" }}
                  >
                    <span className="text-xl">🎬</span>
                    <span className="font-display text-[10px] tracking-widest text-ink-faint">
                      Tap to pick a clip
                    </span>
                  </button>
                )}

                {uploadState === "uploading" && (
                  <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}>
                    <div className="flex items-center justify-between">
                      <p className="font-display text-[10px] tracking-widest text-ink-faint">Uploading…</p>
                      <p className="font-display text-[10px] tracking-widest text-coral">{uploadProgress}%</p>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "var(--coral)" }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ ease: "linear", duration: 0.2 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={cancelUpload}
                      className="font-display text-[9px] tracking-widest text-coral self-end"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {uploadState === "done" && clipUrl && (
                  <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "var(--depth)", border: "1px solid rgba(47,214,192,0.3)" }}>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={clipUrl} controls preload="metadata" className="w-full rounded-lg" style={{ maxHeight: 160, background: "#000" }} />
                    <div className="flex items-center justify-between">
                      <p className="font-display text-[11px] tracking-widest text-teal">Clip ready ✓</p>
                      <button type="button" onClick={clearClip} className="font-display text-[9px] tracking-widest text-coral">
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="font-display text-[9px] tracking-wide text-coral">{uploadError}</p>
                )}
              </motion.div>
            ) : (
              <motion.div key="paste" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                <input
                  type="url"
                  value={pasteClip}
                  onChange={(e) => handlePasteClip(e.target.value)}
                  placeholder={t("ask_clip_ph")}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
                  style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,107,94,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
                />
                {pasteClip && (
                  <div className="mt-2">
                    <VideoSlot url={pasteClip} label={t("ask_your_clip")} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !question.trim() || uploadState === "uploading"}
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
                  className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl text-start transition-all"
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
                        className="font-display text-[11px] tracking-widest px-2 py-0.5 rounded"
                        style={{ color: sm.color, background: sm.bg }}
                      >
                        {t(sm.labelKey).toUpperCase()}
                      </span>
                      <span className="font-display text-[11px] tracking-widest text-ink-faint">
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
