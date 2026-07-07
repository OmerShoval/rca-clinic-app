"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { VideoSlot } from "@/components/ui/video-slot";
import { VideoThumb } from "@/components/ui/video-thumb";
import { useLanguage } from "@/lib/language-context";
import type { PatternPath, PatternStep, PatternSubStep } from "@/lib/patterns";
import { uploadStudentClip } from "@/lib/upload-client";

// ── Trail geometry helpers ───────────────────────────────────────────────────

const LEFT_X = 84;   // px — center-x of left tile (pl-10=40 + half-of-84=42)
const RIGHT_X = 346; // px — center-x of right tile (430-40-42)
const START_Y = 94;  // px — first tile center (pt-7=28 + py-6=24 + half-tile=42)
const STEP_Y = 132;  // px — row height (py-6 top + tile + py-6 bottom = 24+84+24)

function buildSvgPath(n: number): string {
  if (n < 2) return "";
  const xOf = (i: number) => (i % 2 === 0 ? LEFT_X : RIGHT_X);
  const yOf = (i: number) => START_Y + i * STEP_Y;
  let d = `M${xOf(0)},${yOf(0)}`;
  for (let i = 1; i < n; i++) {
    const x0 = xOf(i - 1), y0 = yOf(i - 1);
    const x1 = xOf(i), y1 = yOf(i);
    const mid = (y0 + y1) / 2;
    d += ` C${x0},${mid} ${x1},${mid} ${x1},${y1}`;
  }
  return d;
}

function svgViewH(n: number): number {
  return START_Y + Math.max(0, n - 1) * STEP_Y + 42 + 80;
}

// Horizontal offset that keeps tile centers on the SVG path at any container
// width: the path scales horizontally (preserveAspectRatio="none", 430-wide
// viewBox), so the tile center must sit at (LEFT_X / 430) * width. Tile
// half-width = 42px. (430 - RIGHT_X) / 430 is the same fraction, so one
// constant serves both columns. Physical margins (not justify-start/end) so
// the tiles stay glued to the physical, non-flipping SVG under RTL too.
const TILE_EDGE_PAD = `calc(${((LEFT_X / 430) * 100).toFixed(4)}% - 42px)`;

// ── Tile icons ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width={30} height={30} fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width={30} height={30} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.5 7.1 18.2 8 12.7 4 8.8 9.5 8z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width={30} height={30} fill="none" stroke="#5e7176" strokeWidth={2.2}>
      <rect x={5} y={11} width={14} height={9} rx={2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// ── Step tile ────────────────────────────────────────────────────────────────

function StepTile({ step, isYou }: { step: PatternStep; isYou: boolean }) {
  const reduce = useReducedMotion();

  const baseStyle: React.CSSProperties = {
    width: 84,
    height: 84,
    borderRadius: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
  };

  if (step.status === "done") {
    return (
      <div
        style={{
          ...baseStyle,
          background: "linear-gradient(160deg, #1fc4ad, #0e7d70)",
          boxShadow: "0 8px 0 #074840, 0 18px 30px rgba(0,0,0,.55), inset 0 2px 6px rgba(255,255,255,.35)",
          transform: "rotate(-2deg)",
        }}
      >
        <CheckIcon />
      </div>
    );
  }

  if (step.status === "active") {
    return (
      <motion.div
        style={{
          ...baseStyle,
          background: "linear-gradient(160deg, #ff6a55, #c93f2e)",
          transform: "rotate(-2deg)",
        }}
        animate={
          reduce
            ? {}
            : {
                boxShadow: [
                  "0 8px 0 #7e2517, 0 18px 34px rgba(255,106,85,.25), inset 0 2px 6px rgba(255,255,255,.35)",
                  "0 8px 0 #7e2517, 0 18px 40px rgba(255,106,85,.6), inset 0 2px 6px rgba(255,255,255,.35)",
                  "0 8px 0 #7e2517, 0 18px 34px rgba(255,106,85,.25), inset 0 2px 6px rgba(255,255,255,.35)",
                ],
              }
        }
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Spinning dashed ring */}
        {!reduce && (
          <motion.div
            style={{
              position: "absolute",
              inset: -7,
              borderRadius: 26,
              border: "2px dashed rgba(243,195,74,.55)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
        )}
        {/* YOU badge */}
        {isYou && (
          <div
            style={{
              position: "absolute",
              top: -6,
              insetInlineEnd: -6,
              background: "#f3c34a",
              color: "#1a1207",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 99,
              boxShadow: "0 3px 8px rgba(0,0,0,.4)",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            YOU
          </div>
        )}
        <StarIcon />
      </motion.div>
    );
  }

  // locked
  return (
    <div
      style={{
        ...baseStyle,
        background: "linear-gradient(160deg, #1a2426, #121a1b)",
        boxShadow: "0 8px 0 #0a1112, 0 14px 22px rgba(0,0,0,.45)",
        opacity: 0.65,
      }}
    >
      <LockIcon />
    </div>
  );
}

// ── Bottom sheet ─────────────────────────────────────────────────────────────

function StepSheet({
  step,
  onClose,
  onFeltIt,
  onOpenSubStep,
}: {
  step: PatternStep | null;
  onClose: () => void;
  onFeltIt: () => void;
  onOpenSubStep: (ss: PatternSubStep) => void;
}) {
  const isOpen = !!step;

  return (
    <AnimatePresence>
      {isOpen && step && (
        <>
          {/* Scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
              background: "rgba(4,8,9,.72)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: 60, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 60, x: "-50%", opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              width: "100%",
              maxWidth: 430,
              zIndex: 41,
              background: "linear-gradient(var(--depth), var(--abyss))",
              borderTop: "1px solid var(--glass-edge)",
              borderRadius: "26px 26px 0 0",
              paddingBottom: "calc(32px + env(safe-area-inset-bottom))",
              maxHeight: "85dvh",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Grab handle — full-width tappable area (44px+ touch target) */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="block w-full py-3 cursor-pointer"
            >
              <div
                style={{
                  width: 42,
                  height: 5,
                  borderRadius: 99,
                  background: "rgba(255,255,255,.18)",
                  margin: "0 auto",
                }}
              />
            </button>

            <div className="px-5 flex flex-col gap-4">
              {/* Video */}
              <VideoSlot
                url={step.videoUrl ?? undefined}
                label={step.videoUrl ? "Watch clip" : "Clip coming soon"}
              />

              {/* Step info */}
              <div>
                <p
                  className="font-display tracking-widest mb-1"
                  style={{
                    fontSize: 11,
                    color:
                      step.status === "done"
                        ? "var(--teal)"
                        : step.status === "active"
                        ? "var(--coral)"
                        : "var(--ink-faint)",
                    textTransform: "uppercase",
                  }}
                >
                  {step.status === "done"
                    ? "Completed"
                    : step.status === "active"
                    ? "Active step"
                    : "Locked"}
                </p>
                <h2
                  className="font-display text-ink leading-none"
                  style={{ fontSize: 34 }}
                >
                  {step.title}
                </h2>
                {step.note && (
                  <p
                    className="mt-2 leading-relaxed"
                    style={{ fontSize: 14.5, color: "#bccacd" }}
                  >
                    {step.note}
                  </p>
                )}
              </div>

              {/* ── Sub-steps ── */}
              {step.substeps.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-display tracking-widest" style={{ fontSize: 10, color: "rgba(224,182,79,0.7)", textTransform: "uppercase" }}>
                      Sub-steps · {step.substeps.filter(s => s.done).length}/{step.substeps.length}
                    </p>
                  </div>
                  {/* Mini progress */}
                  <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "rgba(224,182,79,0.7)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${step.substeps.length > 0 ? Math.round((step.substeps.filter(s => s.done).length / step.substeps.length) * 100) : 0}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {step.substeps.map((ss) => {
                      return (
                        <motion.button
                          key={ss.id}
                          onClick={() => onOpenSubStep(ss)}
                          whileTap={{ scale: 0.97 }}
                          className="w-full flex items-center gap-3 text-left rounded-2xl px-3 py-2.5 transition-opacity active:opacity-70"
                          style={{
                            background: ss.done ? "rgba(20,60,30,0.5)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${ss.done ? "rgba(80,200,100,0.3)" : "rgba(255,255,255,0.09)"}`,
                          }}
                        >
                          {/* Done badge */}
                          <div
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              background: ss.done ? "rgba(80,200,100,0.85)" : "rgba(255,255,255,0.08)",
                              border: ss.done ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                            }}
                          >
                            {ss.done && <span style={{ fontSize: 10, color: "#fff" }}>✓</span>}
                          </div>
                          {/* Label */}
                          <p
                            className="flex-1 font-semibold leading-tight"
                            style={{
                              fontSize: 14,
                              color: ss.done ? "rgba(241,238,230,0.55)" : "var(--ink)",
                              textDecoration: ss.done ? "line-through" : "none",
                            }}
                          >
                            {ss.label || "Sub-step"}
                          </p>
                          {/* Thumbnail */}
                          {ss.videoUrl && (
                            <VideoThumb
                              url={ss.videoUrl}
                              label={ss.label}
                              height={60}
                              showPlayIcon={false}
                              className="flex-shrink-0 rounded-lg w-11"
                            />
                          )}
                          {/* Chevron */}
                          {ss.videoUrl && (
                            <span style={{ fontSize: 12, color: "var(--ink-faint)", flexShrink: 0 }}>›</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl font-display tracking-widest transition-opacity active:opacity-70"
                  style={{
                    fontSize: 13,
                    background: "rgba(255,255,255,.045)",
                    border: "1px solid rgba(255,255,255,.08)",
                    color: "var(--ink)",
                  }}
                >
                  Close
                </button>
                {step.status !== "locked" && (
                  <button
                    onClick={onFeltIt}
                    className="flex-1 py-4 rounded-2xl font-display tracking-widest transition-opacity active:opacity-70"
                    style={{
                      fontSize: 13,
                      background: "linear-gradient(160deg, var(--teal), var(--teal-deep))",
                      color: "#031412",
                      boxShadow: "0 8px 22px rgba(31,196,173,.3)",
                    }}
                  >
                    I Felt It ✦
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-step immersive popup ──────────────────────────────────────────────────

function SubStepSheet({
  substep,
  stepTitle,
  onClose,
}: {
  substep: PatternSubStep | null;
  stepTitle: string;
  onClose: () => void;
}) {
  const isOpen = !!substep;

  return (
    <AnimatePresence>
      {isOpen && substep && (
        <>
          {/* Full-screen scrim */}
          <motion.div
            key="ss-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              background: "rgba(2,6,8,.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          />

          {/* Card — scale + fade in from centre */}
          <motion.div
            key="ss-card"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 61,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px",
              pointerEvents: "none",
            }}
          >
            <div
              className="flex flex-col w-full overflow-hidden"
              style={{
                maxWidth: 400,
                maxHeight: "90dvh",
                borderRadius: 28,
                background: "linear-gradient(175deg, rgba(18,28,30,0.98) 0%, rgba(6,12,14,0.98) 100%)",
                border: "1px solid rgba(224,182,79,0.25)",
                boxShadow: "0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(224,182,79,0.08)",
                pointerEvents: "auto",
                overflow: "hidden",
              }}
            >
              {/* Video area */}
              <div className="relative flex-shrink-0" style={{ background: "#000" }}>
                {substep.videoUrl ? (
                  <VideoSlot url={substep.videoUrl} label={substep.label} className="rounded-none" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2" style={{ aspectRatio: "16/9", background: "rgba(255,255,255,0.03)" }}>
                    <span style={{ fontSize: 36 }}>🎬</span>
                    <p className="font-display text-ink-faint" style={{ fontSize: 11, letterSpacing: "0.2em" }}>VIDEO COMING SOON</p>
                  </div>
                )}

                {/* Close button over video */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>

              {/* Info */}
              <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto">
                {/* Breadcrumb */}
                <p className="font-display" style={{ fontSize: 9, letterSpacing: "0.28em", color: "rgba(224,182,79,0.55)", textTransform: "uppercase" }}>
                  {stepTitle} · Sub-step
                </p>

                {/* Title + done badge */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                    style={{
                      background: substep.done ? "rgba(80,200,100,0.85)" : "rgba(255,255,255,0.08)",
                      border: substep.done ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {substep.done && <span style={{ fontSize: 12, color: "#fff" }}>✓</span>}
                  </div>
                  <h2
                    className="font-display text-ink leading-snug flex-1"
                    style={{ fontSize: 26 }}
                  >
                    {substep.label || "Sub-step"}
                  </h2>
                </div>

                {substep.done && substep.doneAt && (
                  <p className="font-display" style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(80,200,100,0.7)", textTransform: "uppercase" }}>
                    ✓ Done {new Date(substep.doneAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                  </p>
                )}

                {/* Close */}
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl font-display tracking-widest transition-opacity active:opacity-70 mt-1"
                  style={{
                    fontSize: 13,
                    background: "rgba(255,255,255,.045)",
                    border: "1px solid rgba(255,255,255,.08)",
                    color: "var(--ink)",
                  }}
                >
                  Back to step
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── "I Felt It" form sheet ────────────────────────────────────────────────────

function getSupportedAudioMime(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const MAX_RECORDING_SECS = 30;

function FeltItSheet({
  open,
  step,
  onClose,
}: {
  open: boolean;
  step: PatternStep | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"voice" | "text">("voice");
  const [note, setNote] = useState("");

  // Voice recording state
  const [recState, setRecState] = useState<"idle" | "recording" | "recorded">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Stop + clean up on close
  useEffect(() => {
    if (!open) {
      stopRecordingCleanly();
      setRecState("idle");
      setElapsed(0);
      if (audioObjectUrl) { URL.revokeObjectURL(audioObjectUrl); setAudioObjectUrl(null); }
      setNote("");
      setDone(false);
      setUploading(false);
      setUploadProgress(0);
      setTab("voice");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopRecordingCleanly() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
  }

  function reset() { onClose(); }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getSupportedAudioMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioObjectUrl(url);
        setRecState("recorded");
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };

      mr.start(250);
      setRecState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECS) {
            stopRecording();
            return MAX_RECORDING_SECS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      // microphone denied — switch to text tab silently
      setTab("text");
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecState("recording"); // onstop will set "recorded"
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function discardRecording() {
    if (audioObjectUrl) { URL.revokeObjectURL(audioObjectUrl); setAudioObjectUrl(null); }
    setRecState("idle");
    setElapsed(0);
  }

  async function handleSubmit() {
    if (!step) return;
    setSubmitting(true);
    try {
      let clipUrl: string | null = null;

      if (tab === "voice" && audioObjectUrl) {
        setUploading(true);
        const mime = mediaRef.current?.mimeType || "audio/webm";
        const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : "webm";
        const blob = await fetch(audioObjectUrl).then((r) => r.blob());
        const file = new File([blob], `felt-it-${step.id}.${ext}`, { type: mime });
        clipUrl = await uploadStudentClip({
          file,
          onProgress: setUploadProgress,
        });
        setUploading(false);
      }

      const questionText = tab === "voice"
        ? `Voice note — ${step.title}`
        : note.trim();

      await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `I felt it — ${step.title}`,
          question_text: questionText,
          clip_url: clipUrl,
          step_ref: step.id,
        }),
      });

      setDone(true);
      setTimeout(reset, 2200);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  const canSubmit = tab === "voice"
    ? recState === "recorded" && !submitting
    : !!note.trim() && !submitting;

  return (
    <AnimatePresence>
      {open && step && (
        <>
          <motion.div
            key="scrim-felt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={reset}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(4,8,9,.8)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          />

          <motion.div
            key="felt-sheet"
            initial={{ y: 60, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 60, x: "-50%", opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              width: "100%",
              maxWidth: 430,
              zIndex: 51,
              background: "linear-gradient(var(--depth), var(--abyss))",
              borderTop: "1px solid var(--glass-edge)",
              borderRadius: "26px 26px 0 0",
              paddingBottom: "calc(36px + env(safe-area-inset-bottom))",
              maxHeight: "85dvh",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Drag pill — full-width tappable area (44px+ touch target) */}
            <button
              type="button"
              onClick={reset}
              aria-label="Close"
              className="block w-full py-3 cursor-pointer"
            >
              <div
                style={{
                  width: 42, height: 5, borderRadius: 99,
                  background: "rgba(255,255,255,.18)",
                  margin: "0 auto",
                }}
              />
            </button>

            <div className="px-5 flex flex-col gap-4">
              {done ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8 gap-3"
                >
                  <span style={{ fontSize: 48 }}>✦</span>
                  <p className="font-display text-teal" style={{ fontSize: 22 }}>Sent to Omer</p>
                  <p className="text-ink-faint text-sm text-center">
                    He&apos;ll see your felt-sense note in his inbox.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div>
                    <p className="font-display tracking-widest mb-1"
                      style={{ fontSize: 11, color: "var(--coral)", textTransform: "uppercase" }}>
                      I Felt It
                    </p>
                    <h2 className="font-display text-ink leading-none" style={{ fontSize: 28 }}>
                      {step.title}
                    </h2>
                    <p className="text-ink-faint mt-1" style={{ fontSize: 13 }}>
                      What did you feel? Be specific — body position, timing, what clicked.
                    </p>
                  </div>

                  {/* Tab toggle */}
                  <div className="flex gap-2">
                    {(["voice", "text"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className="flex-1 py-2 rounded-xl font-display tracking-widest transition-all"
                        style={{
                          fontSize: 12,
                          ...(tab === t
                            ? { background: "var(--coral-soft)", color: "var(--coral)", border: "1px solid rgba(255,107,94,0.3)" }
                            : { background: "transparent", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }),
                        }}
                      >
                        {t === "voice" ? "🎙 Voice Note" : "✍ Write"}
                      </button>
                    ))}
                  </div>

                  {/* Voice tab */}
                  {tab === "voice" && (
                    <div className="flex flex-col gap-3">
                      {recState === "idle" && (
                        <button
                          onClick={startRecording}
                          className="w-full py-5 rounded-2xl font-display tracking-widest flex flex-col items-center gap-1.5"
                          style={{ background: "var(--coral-soft)", border: "1px solid rgba(255,107,94,0.3)", color: "var(--coral)", fontSize: 14 }}
                        >
                          <span style={{ fontSize: 32 }}>🎙</span>
                          Tap to Record
                          <span style={{ fontSize: 10, opacity: 0.7 }}>30 seconds max</span>
                        </button>
                      )}

                      {recState === "recording" && (
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity }}
                            className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ background: "var(--coral-soft)", border: "2px solid var(--coral)" }}
                          >
                            <span style={{ fontSize: 22 }}>🎙</span>
                          </motion.div>
                          <p className="font-display text-coral" style={{ fontSize: 18 }}>{fmt(elapsed)}</p>
                          {/* Progress bar */}
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${(elapsed / MAX_RECORDING_SECS) * 100}%`, background: "var(--coral)" }} />
                          </div>
                          <button
                            onClick={stopRecording}
                            className="w-full py-3 rounded-2xl font-display tracking-widest"
                            style={{ background: "var(--coral-soft)", border: "1px solid rgba(255,107,94,0.3)", color: "var(--coral)", fontSize: 13 }}
                          >
                            Stop Recording
                          </button>
                        </div>
                      )}

                      {recState === "recorded" && audioObjectUrl && (
                        <div className="flex flex-col gap-3">
                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                          <audio src={audioObjectUrl} controls className="w-full h-10" style={{ filter: "invert(1) hue-rotate(180deg)" }} />
                          <button
                            onClick={discardRecording}
                            className="text-center font-display tracking-widest text-ink-faint"
                            style={{ fontSize: 11 }}
                          >
                            Discard &amp; Re-record
                          </button>
                          {uploading && (
                            <div className="flex flex-col gap-1">
                              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "var(--teal)" }} />
                              </div>
                              <p className="font-display text-[10px] tracking-widest text-teal text-center">Uploading… {uploadProgress}%</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text tab */}
                  {tab === "text" && (
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="I felt the rail load when I spotted the section early…"
                      rows={4}
                      className="w-full rounded-2xl px-4 py-3 text-ink placeholder:text-ink-faint resize-none outline-none"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1.5px solid rgba(255,255,255,0.1)",
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                      autoFocus
                    />
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="flex-1 py-4 rounded-2xl font-display tracking-widest"
                      style={{ fontSize: 13, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)", color: "var(--ink)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="flex-1 py-4 rounded-2xl font-display tracking-widest transition-opacity disabled:opacity-40"
                      style={{ fontSize: 13, background: "linear-gradient(160deg, var(--teal), var(--teal-deep))", color: "#031412", boxShadow: "0 8px 22px rgba(31,196,173,.3)" }}
                    >
                      {submitting ? "Sending…" : "Send to Omer →"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main trail component ─────────────────────────────────────────────────────

interface PatternTrailProps {
  slug: string;
  path: PatternPath;
}

export function PatternTrail({ slug, path }: PatternTrailProps) {
  const [activeStep, setActiveStep] = useState<PatternStep | null>(null);
  const [activeSubStep, setActiveSubStep] = useState<PatternSubStep | null>(null);
  const [feltItOpen, setFeltItOpen] = useState(false);
  const reduce = useReducedMotion();
  const { isRTL } = useLanguage();

  const { steps, doneCount, totalCount, title } = path;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const nextStep = steps.find((s) => s.status === "active");

  const svgPath = buildSvgPath(steps.length);
  const viewH = svgViewH(steps.length);

  function openStep(step: PatternStep) {
    if (step.status === "locked") return;
    setActiveStep(step);
  }

  return (
    <>
      <div className="max-w-[430px] mx-auto min-h-dvh pb-nav">
        {/* Radial glow */}
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 500px at 50% -10%, rgba(31,196,173,.10), transparent 60%), radial-gradient(700px 400px at 90% 30%, rgba(255,106,85,.06), transparent 60%)",
          }}
        />

        {/* ── Sticky header ── */}
        <div
          className="sticky top-0 z-10 px-5 pb-4"
          style={{
            background: "linear-gradient(var(--abyss) 70%, transparent)",
            backdropFilter: "blur(4px)",
            paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          }}
        >
          {/* Back link */}
          <Link
            href={`/s/${slug}/patterns`}
            className="font-display text-[10px] tracking-widest text-ink-faint flex items-center gap-1.5 mb-3 hover:text-teal transition-colors"
          >
            {isRTL ? "→" : "←"} Patterns
          </Link>

          <p
            className="font-display text-ink-faint"
            style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}
          >
            Pattern
          </p>
          <h1
            className="font-display text-ink leading-none my-1.5"
            style={{ fontSize: "clamp(36px, 9vw, 46px)", letterSpacing: "0.01em" }}
          >
            {title.split(" ").map((word, wi) =>
              wi === 0 ? (
                <span key={wi}>{word} </span>
              ) : (
                <span key={wi} style={{ color: "var(--teal)" }}>
                  {word}{" "}
                </span>
              )
            )}
          </h1>

          {/* Progress bar */}
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,.07)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, var(--teal-deep), var(--teal))",
                boxShadow: "0 0 14px rgba(31,196,173,.5)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          <div
            className="flex justify-between mt-2 font-display"
            style={{ fontSize: 12, color: "var(--ink-faint)", letterSpacing: "0.04em" }}
          >
            <span>{doneCount} of {totalCount} steps</span>
            {nextStep && <span>{nextStep.title} · up next</span>}
          </div>
        </div>

        {/* ── Trail ── */}
        <div
          className="relative pt-7"
          style={{ minHeight: viewH }}
        >
          {/* SVG background path */}
          {steps.length >= 2 && !reduce && (
            <svg
              className="absolute inset-0 w-full pointer-events-none"
              style={{ height: "100%" }}
              viewBox={`0 0 430 ${viewH}`}
              preserveAspectRatio="none"
            >
              <path
                d={svgPath}
                fill="none"
                stroke="rgba(255,255,255,.10)"
                strokeWidth="3"
                strokeDasharray="2 9"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Step nodes */}
          {steps.map((step, i) => {
            const isLeft = i % 2 === 0;
            const isYou = step.status === "active";

            return (
              <motion.div
                key={step.id}
                initial={reduce ? {} : { opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.08 + i * 0.07,
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative z-10 flex py-6"
              >
                <button
                  onClick={() => openStep(step)}
                  disabled={step.status === "locked"}
                  className="flex flex-col items-center gap-2.5 transition-transform active:scale-95 disabled:cursor-not-allowed"
                  style={
                    isLeft
                      ? { width: 84, marginLeft: TILE_EDGE_PAD, marginRight: "auto" }
                      : { width: 84, marginLeft: "auto", marginRight: TILE_EDGE_PAD }
                  }
                >
                  <StepTile step={step} isYou={isYou} />
                  <span
                    className="font-semibold text-center leading-tight"
                    style={{
                      fontSize: 13,
                      width: 140,
                      color:
                        step.status === "locked" ? "var(--ink-faint)" : "var(--ink)",
                    }}
                  >
                    {step.title}
                  </span>
                </button>
              </motion.div>
            );
          })}

          {/* Empty state */}
          {steps.length === 0 && (
            <div className="flex flex-col items-center py-16 px-5 text-center gap-3">
              <span style={{ fontSize: 40 }}>🌊</span>
              <p className="font-display text-ink" style={{ fontSize: 18 }}>
                Steps coming soon
              </p>
              <p className="text-ink-faint text-sm">
                Your coach will add steps to this pattern.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheets */}
      <StepSheet
        step={activeStep}
        onClose={() => setActiveStep(null)}
        onFeltIt={() => setFeltItOpen(true)}
        onOpenSubStep={(ss) => setActiveSubStep(ss)}
      />
      <SubStepSheet
        substep={activeSubStep}
        stepTitle={activeStep?.title ?? ""}
        onClose={() => setActiveSubStep(null)}
      />
      <FeltItSheet
        open={feltItOpen}
        step={activeStep}
        onClose={() => {
          setFeltItOpen(false);
          setActiveStep(null);
        }}
      />
    </>
  );
}
