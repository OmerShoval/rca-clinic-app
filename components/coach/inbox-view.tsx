"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VideoSlot } from "@/components/ui/video-slot";
import type { Thread } from "@/lib/database.types";

interface EnrichedThread extends Thread {
  student: {
    id: string;
    full_name: string;
    slug: string;
    whatsapp_number: string | null;
  } | null;
}

type ReplyType = "video" | "voice" | "whatsapp";

const STATUS_ORDER: Record<Thread["status"], number> = { new: 0, in_review: 1, answered: 2 };
const STATUS_META = {
  new:       { label: "New",       color: "var(--coral)", bg: "var(--coral-soft)"  },
  in_review: { label: "In Review", color: "var(--gold)",  bg: "var(--gold-soft)"   },
  answered:  { label: "Answered",  color: "var(--teal)",  bg: "var(--teal-soft)"   },
};

export function InboxView() {
  const [threads, setThreads] = useState<EnrichedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyType, setReplyType] = useState<ReplyType>("video");
  const [replyUrl, setReplyUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/coach/threads")
      .then((r) => r.json())
      .then((data) => setThreads(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  function openThread(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    const thread = threads.find((t) => t.id === id);
    setExpandedId(id);
    setReplyType((thread?.reply_type as ReplyType) ?? "video");
    setReplyUrl(thread?.reply_url ?? "");

    // Auto-mark as in_review when opened if currently "new"
    if (thread?.status === "new") {
      updateThread(id, { status: "in_review" });
    }
  }

  async function updateThread(id: string, update: Partial<{ status: Thread["status"]; reply_url: string | null; reply_type: ReplyType | null }>) {
    const res = await fetch(`/api/coach/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      const updated = await res.json();
      setThreads((prev) => prev.map((t) => t.id === id ? { ...t, ...updated } : t));
    }
  }

  async function sendReply(thread: EnrichedThread) {
    setSaving(true);
    const payload: Partial<{ status: Thread["status"]; reply_type: ReplyType; reply_url: string | null }> = {
      status: "answered",
      reply_type: replyType,
      reply_url: replyType === "whatsapp" ? null : replyUrl.trim() || null,
    };
    await updateThread(thread.id, payload);
    setSaving(false);
    setExpandedId(null);
  }

  const sorted = [...threads].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );

  const newCount = threads.filter((t) => t.status === "new").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 rounded-full border-2 border-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-gold text-[11px] tracking-widest mb-0.5">Inbox</p>
          <h2 className="font-display text-ink text-2xl leading-none">Ask Omer</h2>
        </div>
        {newCount > 0 && (
          <div
            className="px-3 py-1 rounded-xl font-display text-[11px] tracking-widest"
            style={{ background: "var(--coral-soft)", color: "var(--coral)" }}
          >
            {newCount} new
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ border: "1.5px dashed var(--glass-edge)" }}>
          <p className="text-3xl mb-2">💬</p>
          <p className="font-display text-ink text-xl mb-1">No questions yet</p>
          <p className="text-ink-faint text-sm">Questions from students will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((thread) => {
            const sm = STATUS_META[thread.status];
            const isOpen = expandedId === thread.id;
            const initials = thread.student?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

            return (
              <div key={thread.id}>
                <button
                  type="button"
                  onClick={() => openThread(thread.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left transition-all hover:opacity-90"
                  style={{
                    background: isOpen ? "var(--glass)" : "var(--depth)",
                    border: "1px solid var(--glass-edge)",
                    borderLeft: `3px solid ${sm.color}`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display text-xs mt-0.5"
                    style={{ background: "rgba(47,214,192,0.12)", color: "var(--teal)" }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-[11px] tracking-wide text-ink">{thread.student?.full_name ?? "Unknown"}</p>
                      <span className="font-display text-[9px] tracking-widest px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: sm.color, background: sm.bg }}>
                        {sm.label.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-ink-dim text-xs mt-0.5 line-clamp-2">{thread.question_text}</p>
                    <p className="font-display text-[9px] tracking-widest text-ink-faint mt-1">
                      {new Date(thread.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="text-ink-faint text-xs flex-shrink-0 mt-1" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </button>

                {/* Expanded panel */}
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
                        className="px-4 py-4 flex flex-col gap-4 rounded-b-2xl"
                        style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)", borderTop: "none" }}
                      >
                        {/* Question */}
                        <p className="text-ink-dim text-sm leading-relaxed">{thread.question_text}</p>

                        {/* Clip */}
                        {thread.clip_url && (
                          <VideoSlot url={thread.clip_url} label="Student's clip" />
                        )}

                        {/* WhatsApp link */}
                        {thread.student?.whatsapp_number && (
                          <a
                            href={`https://wa.me/${thread.student.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hey ${thread.student.full_name?.split(" ")[0]}, here's my reply to your question: `)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl font-display text-[11px] tracking-widest text-teal"
                            style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
                          >
                            💬 Open WhatsApp with {thread.student.full_name?.split(" ")[0]}
                          </a>
                        )}

                        {/* Reply form */}
                        {thread.status !== "answered" ? (
                          <div className="flex flex-col gap-3 pt-1" style={{ borderTop: "1px solid var(--glass-edge)" }}>
                            <p className="font-display text-[10px] tracking-widest text-ink-faint">Reply via</p>
                            <div className="flex gap-2">
                              {(["video", "voice", "whatsapp"] as ReplyType[]).map((type) => {
                                const icons = { video: "🎥 Video", voice: "🎙 Voice", whatsapp: "💬 WhatsApp" };
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => setReplyType(type)}
                                    className="flex-1 py-2 rounded-xl font-display text-[10px] tracking-widest transition-all"
                                    style={replyType === type
                                      ? { background: "var(--gold-soft)", color: "var(--gold)", border: "1px solid rgba(224,182,79,0.3)" }
                                      : { background: "transparent", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
                                    }
                                  >
                                    {icons[type]}
                                  </button>
                                );
                              })}
                            </div>

                            {replyType !== "whatsapp" && (
                              <input
                                type="url"
                                value={replyUrl}
                                onChange={(e) => setReplyUrl(e.target.value)}
                                placeholder={replyType === "video" ? "YouTube / Vimeo / Drive URL…" : "Voice message URL…"}
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
                                style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
                              />
                            )}

                            {replyType === "whatsapp" && (
                              <p className="text-ink-faint text-xs">Reply was sent via WhatsApp. Click the button above to open the chat, then mark as answered below.</p>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() => sendReply(thread)}
                                disabled={saving || (replyType !== "whatsapp" && !replyUrl.trim())}
                                className="flex-1 py-2.5 rounded-xl font-display text-[11px] tracking-widest text-teal transition-all disabled:opacity-40"
                                style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
                              >
                                {saving ? "Saving…" : "Mark Answered ✓"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1" style={{ borderTop: "1px solid var(--glass-edge)" }}>
                            <p className="font-display text-[10px] tracking-widest text-teal mb-2">Reply sent via {thread.reply_type}</p>
                            {thread.reply_url && <VideoSlot url={thread.reply_url} label="Your reply" />}
                            <button
                              onClick={() => updateThread(thread.id, { status: "in_review" })}
                              className="mt-3 font-display text-[10px] tracking-widest text-ink-faint hover:text-coral transition-colors"
                            >
                              Reopen
                            </button>
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
    </motion.div>
  );
}
