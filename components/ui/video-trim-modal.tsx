"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { loadFFmpeg, clearFFmpegInstance } from "@/lib/ffmpeg-loader";

interface Props {
  file: File;
  onConfirm: (trimmed: File) => void;
  onCancel: () => void;
}

type Phase = "idle" | "loading_engine" | "trimming" | "done";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoTrimModal({ file, onConfirm, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [objectUrl] = useState(() => URL.createObjectURL(file));
  const [duration, setDuration] = useState(0);
  const [startPct, setStartPct] = useState(0);    // 0–1
  const [endPct, setEndPct] = useState(1);         // 0–1
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  // Update video preview to loop between trim points
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !duration) return;
    const start = startPct * duration;
    if (vid.currentTime < start || vid.currentTime > endPct * duration) {
      vid.currentTime = start;
    }
  }, [startPct, endPct, duration]);

  function onLoadedMetadata() {
    const d = videoRef.current?.duration ?? 0;
    setDuration(d);
  }

  function onTimeUpdate() {
    const vid = videoRef.current;
    if (!vid || !duration) return;
    if (vid.currentTime >= endPct * duration) {
      vid.currentTime = startPct * duration;
    }
  }

  // Drag logic for timeline handles
  const getPct = useCallback((clientX: number): number => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent | TouchEvent) {
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const pct = getPct(x);
      if (dragging === "start") {
        setStartPct(Math.min(pct, endPct - 0.02));
        if (videoRef.current && duration) videoRef.current.currentTime = pct * duration;
      } else {
        setEndPct(Math.max(pct, startPct + 0.02));
        if (videoRef.current && duration) videoRef.current.currentTime = pct * duration;
      }
    }
    function onUp() { setDragging(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, startPct, endPct, duration, getPct]);

  async function trimAndCompress() {
    if (!duration) return;
    cancelRef.current = false;
    setPhase("loading_engine");
    setProgress(0);
    setError(null);

    try {
      const ff = await loadFFmpeg((p) => {
        setPhase("trimming");
        setProgress(p);
      });

      if (cancelRef.current) { setPhase("idle"); return; }

      const { fetchFile } = await import("@ffmpeg/util");
      setPhase("trimming");

      const startSec = startPct * duration;
      const endSec = endPct * duration;

      await ff.writeFile("input", await fetchFile(file));
      if (cancelRef.current) { setPhase("idle"); return; }

      await ff.exec([
        "-ss", String(startSec.toFixed(3)),
        "-to", String(endSec.toFixed(3)),
        "-i", "input",
        "-c:v", "libx264",
        "-crf", "28",
        "-preset", "fast",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:a", "aac",
        "-b:a", "96k",
        "-movflags", "faststart",
        "output.mp4",
      ]);

      if (cancelRef.current) { setPhase("idle"); return; }

      const raw = await ff.readFile("output.mp4") as Uint8Array;
      const blob = new Blob([new Uint8Array(raw)], { type: "video/mp4" });
      const trimmedFile = new File([blob], "clip.mp4", { type: "video/mp4" });

      await ff.deleteFile("input").catch(() => {});
      await ff.deleteFile("output.mp4").catch(() => {});

      setPhase("done");
      onConfirm(trimmedFile);
    } catch (err) {
      if (cancelRef.current) { setPhase("idle"); return; }
      clearFFmpegInstance();
      setError(err instanceof Error ? err.message : "Trim failed — try a shorter clip");
      setPhase("idle");
    }
  }

  function cancel() {
    cancelRef.current = true;
    clearFFmpegInstance();
    onCancel();
  }

  const startSec = startPct * duration;
  const endSec = endPct * duration;
  const trimDuration = endSec - startSec;
  const busy = phase === "loading_engine" || phase === "trimming";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col gap-4 rounded-2xl p-5 w-full max-w-lg"
        style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-[11px] tracking-[0.2em] text-gold">TRIM CLIP</p>
          <p className="font-display text-[9px] text-ink-faint">{file.name}</p>
        </div>

        {/* Video preview */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={objectUrl}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          controls
          className="w-full rounded-xl"
          style={{ maxHeight: 240, background: "#000" }}
        />

        {/* Timeline */}
        {duration > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between font-display text-[9px] text-ink-faint">
              <span>{formatTime(startSec)}</span>
              <span className="text-gold">{formatTime(trimDuration)} selected</span>
              <span>{formatTime(endSec)}</span>
            </div>

            {/* Track */}
            <div
              ref={timelineRef}
              className="relative h-8 rounded-lg select-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-edge)" }}
            >
              {/* Gold fill between handles */}
              <div
                className="absolute top-0 bottom-0 rounded"
                style={{
                  left: `${startPct * 100}%`,
                  right: `${(1 - endPct) * 100}%`,
                  background: "rgba(224,182,79,0.25)",
                  borderLeft: "2px solid var(--gold)",
                  borderRight: "2px solid var(--gold)",
                }}
              />

              {/* Start handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full cursor-ew-resize flex items-center justify-center shadow-lg"
                style={{ left: `${startPct * 100}%`, background: "var(--gold)", zIndex: 2 }}
                onMouseDown={(e) => { e.preventDefault(); setDragging("start"); }}
                onTouchStart={(e) => { e.preventDefault(); setDragging("start"); }}
              >
                <span style={{ fontSize: 8, color: "var(--abyss)", fontWeight: 700 }}>◀</span>
              </div>

              {/* End handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full cursor-ew-resize flex items-center justify-center shadow-lg"
                style={{ left: `${endPct * 100}%`, background: "var(--gold)", zIndex: 2 }}
                onMouseDown={(e) => { e.preventDefault(); setDragging("end"); }}
                onTouchStart={(e) => { e.preventDefault(); setDragging("end"); }}
              >
                <span style={{ fontSize: 8, color: "var(--abyss)", fontWeight: 700 }}>▶</span>
              </div>
            </div>

            <p className="font-display text-[8px] text-ink-faint text-center opacity-60">
              Drag handles to select the clip range
            </p>
          </div>
        )}

        {/* Progress */}
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-[10px] tracking-widest text-gold animate-pulse">
                  {phase === "loading_engine" ? "Loading converter…" : `Trimming & compressing… ${progress}%`}
                </p>
              </div>
              {phase === "trimming" && (
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--gold)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="font-display text-[9px] tracking-wide text-coral">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={trimAndCompress}
            disabled={busy || duration === 0}
            className="flex-1 rounded-xl py-2.5 font-display text-[11px] tracking-widest text-abyss transition-opacity"
            style={{ background: "var(--gold)", opacity: busy || duration === 0 ? 0.5 : 1 }}
          >
            {busy ? "Processing…" : "Trim & Compress"}
          </button>
          <button
            onClick={cancel}
            className="rounded-xl px-4 py-2.5 font-display text-[11px] tracking-widest text-ink-faint"
            style={{ border: "1px solid var(--glass-edge)" }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
