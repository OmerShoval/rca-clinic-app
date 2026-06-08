"use client";

import {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Headphones } from "lucide-react";

/* ── Types ── */

export interface MeditationTrack {
  title: string;
  src: string;
  cover?: string;
}

type LoopMode = "off" | "all" | "one";
type Direction = "next" | "prev" | null;
type AudioCtor = typeof AudioContext;

/* ── useRafLoop ── */

function useRafLoop(cb: (now: number, dt: number) => void) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      cbRef.current(now, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/* ── useTransitionSound ── */

function useTransitionSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);
  return useCallback((bassEnergy = 0.5) => {
    try {
      if (!ctxRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctor: AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startFreq = 440 + bassEnergy * 440;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * (2 / 3), now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      /* Web Audio unavailable */
    }
  }, []);
}

/* ── useAudioAnalyser ── */

const FFT_SIZE = 256;

function useAudioAnalyser(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array>(new Uint8Array(FFT_SIZE / 2));
  const connectedRef = useRef(false);

  const connect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || connectedRef.current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctor: AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      connectedRef.current = true;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch {
      /* unavailable or already connected */
    }
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener("play", connect, { once: true });
    return () => audio.removeEventListener("play", connect);
  }, [audioRef, connect]);

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  const getFrequencyData = useCallback((): Uint8Array | null => {
    const analyser = analyserRef.current;
    if (!analyser) return null;
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume().catch(() => {});
    analyser.getByteFrequencyData(dataRef.current as Uint8Array<ArrayBuffer>);
    return dataRef.current;
  }, []);

  const getBandEnergy = useCallback((startBin: number, endBin: number): number => {
    if (!analyserRef.current) return 0;
    const data = dataRef.current;
    const count = endBin - startBin;
    if (count <= 0) return 0;
    let sum = 0;
    for (let i = startBin; i < endBin && i < data.length; i++) sum += data[i];
    return sum / count / 255;
  }, []);

  return { getFrequencyData, getBandEnergy };
}

/* ── Audio player state ── */

interface PlayerState {
  currentIndex: number;
  order: number[];
  shuffled: boolean;
  loopMode: LoopMode;
  isPlaying: boolean;
  direction: Direction;
}
type PlayerAction =
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "SET_TRACK"; index: number; direction: Direction }
  | { type: "TOGGLE_SHUFFLE"; trackCount: number }
  | { type: "CYCLE_LOOP" };

function shuffleOrder(pinFirst: number, count: number): number[] {
  const rest = Array.from({ length: count }, (_, i) => i).filter((x) => x !== pinFirst);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [pinFirst, ...rest];
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "PLAY":   return { ...state, isPlaying: true };
    case "PAUSE":  return { ...state, isPlaying: false };
    case "SET_TRACK": return { ...state, currentIndex: action.index, direction: action.direction };
    case "TOGGLE_SHUFFLE": {
      const shuffled = !state.shuffled;
      return {
        ...state,
        shuffled,
        order: shuffled
          ? shuffleOrder(state.currentIndex, action.trackCount)
          : Array.from({ length: action.trackCount }, (_, i) => i),
      };
    }
    case "CYCLE_LOOP": {
      const next: LoopMode = state.loopMode === "off" ? "all" : state.loopMode === "all" ? "one" : "off";
      return { ...state, loopMode: next };
    }
    default: return state;
  }
}

function useAudioPlayer(tracks: MeditationTrack[]) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [state, dispatch] = useReducer(playerReducer, {
    currentIndex: 0,
    order: Array.from({ length: tracks.length }, (_, i) => i),
    shuffled: false,
    loopMode: "off",
    isPlaying: false,
    direction: null,
  });

  const { getFrequencyData, getBandEnergy } = useAudioAnalyser(
    audioRef as React.RefObject<HTMLAudioElement | null>
  );
  const playTransitionSound = useTransitionSound();

  const loadTrack = useCallback(
    (index: number, autoplay: boolean, direction: Direction) => {
      const audio = audioRef.current;
      if (!audio) return;
      const bassEnergy = getBandEnergy(0, 4);
      playTransitionSound(bassEnergy);
      dispatch({ type: "SET_TRACK", index, direction });
      audio.src = tracks[index].src;
      audio.load();
      if (autoplay) audio.play().catch(() => {});
    },
    [tracks, playTransitionSound, getBandEnergy]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const pos = state.order.indexOf(state.currentIndex);
    const np = pos + 1;
    if (np >= state.order.length) {
      if (state.loopMode === "all") loadTrack(state.order[0], !audio.paused, "next");
      else { audio.pause(); audio.currentTime = 0; }
      return;
    }
    loadTrack(state.order[np], !audio.paused, "next");
  }, [state.order, state.currentIndex, state.loopMode, loadTrack]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const pos = state.order.indexOf(state.currentIndex);
    const pp = pos - 1;
    if (pp < 0) {
      if (state.loopMode === "all") loadTrack(state.order[state.order.length - 1], !audio.paused, "prev");
      else audio.currentTime = 0;
      return;
    }
    loadTrack(state.order[pp], !audio.paused, "prev");
  }, [state.order, state.currentIndex, state.loopMode, loadTrack]);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = pct * audio.duration;
  }, []);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: "TOGGLE_SHUFFLE", trackCount: tracks.length });
  }, [tracks.length]);

  const cycleLoop = useCallback(() => {
    dispatch({ type: "CYCLE_LOOP" });
  }, []);

  const goToTrack = useCallback((index: number) => {
    const audio = audioRef.current;
    if (!audio || index === state.currentIndex) return;
    const direction: Direction = index > state.currentIndex ? "next" : "prev";
    loadTrack(index, !audio.paused, direction);
  }, [state.currentIndex, loadTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay  = () => dispatch({ type: "PLAY" });
    const onPause = () => dispatch({ type: "PAUSE" });
    const onMeta  = () => setDuration(audio.duration);
    const onTime  = () => { setCurrentTime(audio.currentTime); if (audio.duration) setDuration(audio.duration); };
    const onEnded = () => {
      if (state.loopMode === "one") { audio.currentTime = 0; audio.play().catch(() => {}); }
      else next();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [state.loopMode, next]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !tracks.length) return;
    audio.src = tracks[0].src;
    audio.load();
  }, [tracks]);

  return {
    audioRef,
    state,
    currentTime,
    duration,
    currentTrack: tracks[state.currentIndex],
    toggle,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleLoop,
    goToTrack,
    getFrequencyData,
  };
}

/* ── ScalesMixer ── */

const COLS = 10;
const ROWS = 10;
const BAND_RANGES: [number, number][] = [
  [0, 1], [1, 3], [3, 6], [6, 10], [10, 16],
  [16, 24], [24, 36], [36, 52], [52, 74], [74, 100],
];
const sineOut   = (x: number) => Math.sin((x * Math.PI) / 2);
const sineIn    = (x: number) => 1 - Math.cos((x * Math.PI) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const lerp      = (a: number, b: number, t: number) => a + (b - a) * t;

const PART_A_DUR  = 1.5;
const PART_A_TO   = 11;
const PART_A_STEP = 3 / (COLS - 1);
const PART_B_DUR  = 1;
const SCALE_FROM  = 0.133;
const SCALE_TO    = 0.8;

function partAColumnY(time: number, col: number): number {
  const local = time - col * PART_A_STEP;
  const period = PART_A_DUR * 2;
  const cyc = ((local % period) + period) % period;
  if (cyc < PART_A_DUR) return PART_A_TO * sineInOut(cyc / PART_A_DUR);
  return PART_A_TO * sineInOut(1 - (cyc - PART_A_DUR) / PART_A_DUR);
}

function partBCircle(time: number, col: number, row: number): [number, number] {
  const frac  = row / ROWS;
  const yFrom = lerp(77, -77, frac);
  const yTo   = lerp(col, -col, frac);
  const local = time - col / COLS;
  const period = PART_B_DUR * 2;
  const cyc   = ((local % period) + period) % period;
  const e     = cyc < PART_B_DUR ? sineOut(cyc / PART_B_DUR) : sineIn(1 - (cyc - PART_B_DUR) / PART_B_DUR);
  return [lerp(yFrom, yTo, e), lerp(SCALE_FROM, SCALE_TO, e)];
}

function ScalesMixer({
  isPlaying,
  getFrequencyData,
}: {
  isPlaying: boolean;
  getFrequencyData?: () => Uint8Array | null;
}) {
  const maskId     = useId().replace(/:/g, "_");
  const colRefs    = useRef<(SVGGElement | null)[]>([]);
  const circleRefs = useRef<(SVGCircleElement | null)[][]>(
    Array.from({ length: COLS }, () => [])
  );
  const tRef = useRef(50);

  useRafLoop((_, dt) => {
    if (isPlaying) tRef.current += dt / 1000;
    const time    = tRef.current;
    const freqData = getFrequencyData?.();
    for (let c = 0; c < COLS; c++) {
      let energy = 1.0;
      if (freqData) {
        const [binStart, binEnd] = BAND_RANGES[c];
        let sum = 0;
        for (let b = binStart; b < binEnd; b++) sum += freqData[b] ?? 0;
        energy = Math.sqrt(sum / (binEnd - binStart) / 255);
      }
      const bobGain   = freqData ? 0.4 + energy : 1;
      const scaleGain = freqData ? 0.5 + energy : 1;
      const colEl = colRefs.current[c];
      if (colEl) colEl.style.transform = `translate(${c * 10}px, ${partAColumnY(time, c) * bobGain}px)`;
      for (let r = 0; r < ROWS; r++) {
        const circle = circleRefs.current[c][r];
        if (!circle) continue;
        const [ty, s] = partBCircle(time, c, r);
        circle.style.transform = `translateY(${ty}px) scale(${s * scaleGain})`;
      }
    }
  });

  return (
    <svg viewBox="0 0 98 108" aria-hidden="true" style={{ width: "100%", height: 52, overflow: "visible" }}>
      <mask id={maskId}>
        <rect width="10" height="10" fill="#fff" />
      </mask>
      {Array.from({ length: COLS }, (_, c) => (
        <g key={c} ref={(el) => { colRefs.current[c] = el; }} style={{ transform: `translate(${c * 10}px, 0px)` }}>
          {Array.from({ length: ROWS }, (_, r) => (
            <g key={r} mask={`url(#${maskId})`} transform={`translate(0 ${r * 10})`}>
              <circle
                ref={(el) => { circleRefs.current[c][r] = el; }}
                cx="5" cy="5" r="5"
                fill="oklch(0.68 0.14 188 / 0.62)"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

/* ── VinylDisc ── */

function VinylDisc({
  isPlaying,
  trackKey,
  direction,
}: {
  isPlaying: boolean;
  trackKey: number;
  direction: Direction;
}) {
  const spinRef = useRef<HTMLDivElement>(null);
  const rotRef  = useRef(0);
  const velRef  = useRef(0);

  useRafLoop(() => {
    const el = spinRef.current;
    if (!el) return;
    if (isPlaying) velRef.current += (0.38 - velRef.current) * 0.18;
    else { velRef.current *= 0.97; if (velRef.current < 0.001) velRef.current = 0; }
    rotRef.current += velRef.current;
    el.style.transform = `rotate(${rotRef.current}deg)`;
  });

  return (
    <div className="relative w-32 h-32 mx-auto flex-shrink-0 select-none">
      {/* Glow ring */}
      <div
        className="absolute -inset-1.5 rounded-full transition-all duration-700"
        style={{
          boxShadow: isPlaying
            ? "0 0 32px oklch(0.68 0.14 188 / 30%), 0 0 10px oklch(0.68 0.14 188 / 15%)"
            : "none",
        }}
      />
      {/* Spinning vinyl */}
      <div
        ref={spinRef}
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "conic-gradient(from 0deg, oklch(0.09 0.03 210) 0deg, oklch(0.19 0.09 188) 50deg, oklch(0.11 0.04 210) 105deg, oklch(0.17 0.07 195) 165deg, oklch(0.09 0.03 210) 225deg, oklch(0.21 0.09 185) 285deg, oklch(0.09 0.03 210) 360deg)",
        }}
      >
        <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
        <div className="absolute inset-5 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-8 rounded-full border border-primary/[0.08]" />
      </div>
      {/* Static center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={trackKey}
            initial={{ opacity: 0, scale: 0.65, rotate: direction === "next" ? -30 : 30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.65 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.12 0.025 210)", border: "1px solid oklch(0.68 0.14 188 / 20%)" }}
          >
            <div
              className="w-3 h-3 rounded-full transition-all duration-500"
              style={{
                background: isPlaying ? "oklch(0.68 0.14 188)" : "oklch(0.68 0.14 188 / 25%)",
                boxShadow: isPlaying ? "0 0 8px oklch(0.68 0.14 188 / 70%)" : "none",
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function fmt(s: number): string {
  if (!isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ── MeditationPlayer ── */

function MeditationPlayer({ tracks }: { tracks: MeditationTrack[] }) {
  const player = useAudioPlayer(tracks);
  const pct = player.duration ? (player.currentTime / player.duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-primary/15 bg-card overflow-hidden">
      <audio ref={player.audioRef} preload="metadata" crossOrigin="anonymous" />

      <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
        {/* Spinning disc */}
        <VinylDisc
          isPlaying={player.state.isPlaying}
          trackKey={player.state.currentIndex}
          direction={player.state.direction}
        />

        {/* Track info — slides on track change */}
        <div className="text-center overflow-hidden min-h-[2.5rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={player.state.currentIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-sm font-semibold text-foreground/90 leading-snug">
                {player.currentTrack.title}
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 tracking-wide">
                Coach Omer
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Audio visualizer */}
        <div style={{ height: 52, overflow: "hidden" }}>
          <ScalesMixer isPlaying={player.state.isPlaying} getFrequencyData={player.getFrequencyData} />
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div
            className="h-[3px] rounded-full cursor-pointer relative overflow-hidden"
            style={{ background: "oklch(0.68 0.14 188 / 12%)" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              player.seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
            }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${pct}%`, background: "oklch(0.68 0.14 188)", transition: "width 0.08s linear" }}
            />
          </div>
          <div className="flex items-center justify-between" style={{ fontSize: 10 }}>
            <span className="text-muted-foreground/40 font-mono">{fmt(player.currentTime)}</span>
            <span className="text-muted-foreground/40 font-mono">{fmt(player.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-1">
          {/* Shuffle */}
          <button
            onClick={player.toggleShuffle}
            className={`p-2 rounded-lg transition-colors ${
              player.state.shuffled ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
            }`}
            aria-label="Shuffle"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /><path d="M16 21h5v-5" /><path d="M21 21l-7-7" /><path d="M3 3l7 7" />
            </svg>
          </button>

          {/* Prev */}
          <button onClick={player.prev} className="p-2 text-muted-foreground/70 hover:text-foreground transition-colors" aria-label="Previous">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 5L8 12l11 7zM5 5h2v14H5z" />
            </svg>
          </button>

          {/* Play / Pause */}
          <motion.button
            onClick={player.toggle}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="w-13 h-13 rounded-full flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              background: "oklch(0.68 0.14 188)",
              color: "oklch(0.10 0.015 210)",
              boxShadow: player.state.isPlaying
                ? "0 0 24px oklch(0.68 0.14 188 / 45%)"
                : "0 2px 8px oklch(0 0 0 / 30%)",
              transition: "box-shadow 0.5s",
            }}
            aria-label={player.state.isPlaying ? "Pause" : "Play"}
          >
            {player.state.isPlaying ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 5h3v14H6zM15 5h3v14h-3z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M7 5v14l11-7z" />
              </svg>
            )}
          </motion.button>

          {/* Next */}
          <button onClick={player.next} className="p-2 text-muted-foreground/70 hover:text-foreground transition-colors" aria-label="Next">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M5 5l11 7L5 19zM17 5h2v14h-2z" />
            </svg>
          </button>

          {/* Loop */}
          <button
            onClick={player.cycleLoop}
            className={`p-2 rounded-lg transition-colors relative ${
              player.state.loopMode !== "off" ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
            }`}
            aria-label="Loop"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12V8a2 2 0 0 1 2-2h12" />
              <path d="M16 3l4 3l-4 3" />
              <path d="M20 12v4a2 2 0 0 1-2 2H6" />
              <path d="M8 21l-4-3l4-3" />
            </svg>
            {player.state.loopMode === "one" && (
              <span
                className="absolute font-bold text-primary leading-none"
                style={{ fontSize: 8, top: -1, right: -1 }}
              >
                1
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Track list */}
      {tracks.length > 1 && (
        <div className="border-t border-border/25 px-4 py-3 flex flex-col gap-0.5">
          {tracks.map((t, i) => (
            <motion.button
              key={i}
              whileHover={{ x: 2 }}
              onClick={() => player.goToTrack(i)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-200 ${
                i === player.state.currentIndex
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              <span className="text-xs font-mono w-4 flex-shrink-0 opacity-50">{i + 1}</span>
              <span className="text-xs font-medium flex-1 truncate">{t.title}</span>
              {i === player.state.currentIndex && player.state.isPlaying && (
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "oklch(0.68 0.14 188)" }}
                />
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── PersonalMeditation (exported) ── */

export function PersonalMeditation({ tracks }: { tracks: MeditationTrack[] }) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border/30 px-4 py-3.5 opacity-50">
        <div className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center">
          <Headphones className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/50">Personal Meditation</p>
          <p className="text-xs text-muted-foreground/40">Not added yet</p>
        </div>
      </div>
    );
  }

  return <MeditationPlayer tracks={tracks} />;
}
