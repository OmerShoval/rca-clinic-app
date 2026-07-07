"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { cfManifestUrl, cfThumbnailUrl } from "@/lib/video";

interface HlsPlayerProps {
  /** Cloudflare Stream uid — manifest + poster are derived from it. */
  uid?: string;
  /** Arbitrary HLS manifest URL (used when no `uid` is given). */
  manifestUrl?: string;
  /** Poster/still image URL (used when no `uid` is given; may be undefined). */
  posterUrl?: string;
  label?: string;
  className?: string;
}

const SPEEDS = [0.25, 0.5, 1, 2] as const;
const HIDE_DELAY = 3000;

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function HlsPlayer({ uid, manifestUrl, posterUrl, label, className }: HlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manifest + poster resolve from a CF uid when given, else the explicit props.
  const hlsUrl = uid ? cfManifestUrl(uid) : manifestUrl ?? null;
  const thumbUrl = uid ? cfThumbnailUrl(uid) : posterUrl ?? null;

  // Load hls.js dynamically and attach to the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!hlsUrl) {
      setError("Video unavailable.");
      return;
    }

    let hlsInstance: import("hls.js").default | null = null;
    let cancelled = false;

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;

      if (Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: true });
        hlsInstance.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            setError("Video unavailable — it may still be processing. Try refreshing.");
          }
        });
        hlsInstance.loadSource(hlsUrl);
        hlsInstance.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari handles HLS natively
        video.src = hlsUrl;
      } else {
        setError("Your browser does not support HLS video.");
      }
    });

    return () => {
      cancelled = true;
      hlsInstance?.destroy();
    };
  }, [hlsUrl]);

  // Sync video events to state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length > 0 && v.duration > 0) {
        setBufferedPct((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
      }
    };
    const onDurationChange = () => setDuration(isFinite(v.duration) ? v.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPlaying = () => { setPlaying(true); setBuffering(false); };
    const onWaiting = () => setBuffering(true);
    const onPause = () => { setPlaying(false); setControlsVisible(true); };
    const onEnded = () => { setPlaying(false); setControlsVisible(true); };
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("durationchange", onDurationChange);
    v.addEventListener("play", onPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("durationchange", onDurationChange);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  // Clean up the hide timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Show controls and schedule auto-hide while playing
  const flashControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setControlsVisible(false);
    }, HIDE_DELAY);
  }, []);

  async function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (!started) {
      setStarted(true);
      setBuffering(true);
      await v.play().catch(() => {});
      flashControls();
      return;
    }
    if (v.paused) {
      await v.play().catch(() => {});
      flashControls();
    } else {
      v.pause();
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = (parseFloat(e.target.value) / 100) * duration;
    flashControls();
  }

  function applySpeed(rate: number) {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
    setSpeed(rate);
    flashControls();
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      // iPhone Safari has no Element.requestFullscreen — fall back to the
      // video element's native webkitEnterFullscreen.
      const v = videoRef.current as
        | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        | null;
      if (containerRef.current?.requestFullscreen && document.fullscreenEnabled) {
        await containerRef.current.requestFullscreen();
      } else {
        v?.webkitEnterFullscreen?.();
      }
    } else {
      await document.exitFullscreen();
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showPoster = !!thumbUrl && !posterError && !started;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-xl bg-black select-none", className)}
      style={{ aspectRatio: "16/9" }}
      onMouseMove={() => { if (started && playing) flashControls(); }}
      onTouchStart={() => { if (started && playing) flashControls(); }}
    >
      {/* ── Video element (no native poster — we render a resilient one below) ── */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        preload="metadata"
        onClick={togglePlay}
        style={{ cursor: "pointer" }}
      />

      {/* ── Poster still (falls back to a black frame if it 404s while transcoding) ── */}
      {showPoster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl!}
          alt={label ?? "video poster"}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          onError={() => setPosterError(true)}
        />
      )}

      {/* ── Buffering spinner (between play-tap and playback start / mid-stall) ── */}
      {started && buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="rounded-full"
            style={{
              width: 40,
              height: 40,
              border: "3px solid rgba(255,255,255,0.25)",
              borderTopColor: "var(--teal)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}

      {/* ── Before play: big play button over thumbnail ── */}
      <AnimatePresence>
        {!started && (
          <motion.button
            type="button"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(0,0,0,0.28)" }}
            onClick={togglePlay}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
              style={{ background: "rgba(255,255,255,0.92)", paddingLeft: 5 }}
            >
              <span style={{ fontSize: 28, color: "#000", lineHeight: 1 }}>▶</span>
            </motion.div>
            {label && (
              <span className="font-display text-[11px] tracking-[0.2em] text-white drop-shadow">
                {label}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Controls overlay (auto-hides 3 s after play starts) ── */}
      <AnimatePresence>
        {started && controlsVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            dir="ltr"
            className="absolute bottom-0 left-0 right-0 px-3 pt-10 pb-3 flex flex-col gap-2.5"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
            }}
          >
            {/* ── Scrubber ── */}
            <div className="relative h-11 flex items-center" style={{ touchAction: "none" }}>
              {/* Track backgrounds */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{ inset: "auto 0", height: 3, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)" }}
              />
              {/* Buffered */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{ left: 0, width: `${bufferedPct}%`, height: 3, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.28)" }}
              />
              {/* Played */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{ left: 0, width: `${progress}%`, height: 3, top: "50%", transform: "translateY(-50%)", background: "var(--teal)" }}
              />
              {/* Thumb */}
              <div
                className="absolute w-3 h-3 rounded-full pointer-events-none"
                style={{ left: `calc(${progress}% - 6px)`, top: "50%", transform: "translateY(-50%)", background: "var(--teal)", boxShadow: "0 0 4px rgba(47,214,192,0.6)" }}
              />
              {/* Transparent range input on top for interaction */}
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="Seek"
              />
            </div>

            {/* ── Controls row ── */}
            <div className="flex items-center gap-2">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-11 h-11 -m-2 flex items-center justify-center flex-shrink-0 text-white"
                aria-label={playing ? "Pause" : "Play"}
              >
                <span style={{ fontSize: 15 }}>{playing ? "⏸" : "▶"}</span>
              </button>

              {/* Time */}
              <span className="font-display text-[9px] tracking-wide text-white/75 flex-shrink-0 tabular-nums">
                {fmtTime(currentTime)}&nbsp;/&nbsp;{fmtTime(duration)}
              </span>

              <div className="flex-1" />

              {/* Speed pills */}
              {SPEEDS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => applySpeed(rate)}
                  className="font-display text-[9px] tracking-wide px-3 py-2.5 rounded transition-colors flex-shrink-0"
                  style={
                    speed === rate
                      ? { background: "var(--teal)", color: "var(--abyss)" }
                      : { background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }
                  }
                  aria-label={`${rate}× speed`}
                >
                  {rate}×
                </button>
              ))}

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-11 h-11 -m-2 flex items-center justify-center flex-shrink-0 text-white/75"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                <span style={{ fontSize: 13 }}>{isFullscreen ? "⊡" : "⛶"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="font-display text-[10px] tracking-widest text-coral text-center leading-relaxed">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
