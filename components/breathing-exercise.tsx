"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";

interface BreathingExerciseProps {
  onComplete: () => void;
}

type PhaseName = "inhale" | "hold" | "exhale";

const PHASES: { phase: PhaseName; duration: number; label: string; sub: string }[] = [
  { phase: "inhale", duration: 4000, label: "Breathe In", sub: "Fill your lungs slowly" },
  { phase: "hold",   duration: 4000, label: "Hold",       sub: "Stay still" },
  { phase: "exhale", duration: 6000, label: "Breathe Out", sub: "Release everything slowly" },
];

const TOTAL_CYCLES = 3;

export function BreathingExercise({ onComplete }: BreathingExerciseProps) {
  const [cycle, setCycle] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const isDone = cycle >= TOTAL_CYCLES;
  const current = PHASES[phaseIdx];

  useEffect(() => {
    if (isDone) return;
    const start = Date.now();
    const duration = current.duration;
    let raf: number;

    function tick() {
      const p = Math.min((Date.now() - start) / duration, 1);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        const nextIdx = phaseIdx + 1;
        if (nextIdx >= PHASES.length) {
          const nextCycle = cycle + 1;
          setCycle(nextCycle);
          setPhaseIdx(0);
        } else {
          setPhaseIdx(nextIdx);
        }
        setProgress(0);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cycle, phaseIdx, isDone, current.duration]);

  const circleScale = !current
    ? 1
    : current.phase === "inhale"
    ? 0.7 + progress * 0.5
    : current.phase === "hold"
    ? 1.2
    : 1.2 - progress * 0.5;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen gradient-ocean flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="mb-12">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Breathing Exercise</p>
        <h1 className="text-xl font-semibold mt-2">Let&apos;s calm the mind</h1>
      </div>

      {!isDone ? (
        <>
          <div className="relative flex items-center justify-center mb-14">
            <motion.div
              animate={{ scale: circleScale }}
              transition={{ duration: 0.08 }}
              className="absolute w-64 h-64 rounded-full border border-primary/10 bg-primary/5"
            />
            <motion.div
              animate={{ scale: circleScale }}
              transition={{ duration: 0.08 }}
              className="w-44 h-44 rounded-full bg-primary/12 border-2 border-primary/25 flex flex-col items-center justify-center glow-teal"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.phase + cycle}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-center px-4"
                >
                  <p className="text-teal font-bold text-base">{current.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">{current.sub}</p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="flex gap-2 mb-10">
            {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < cycle ? "bg-primary scale-100" : i === cycle ? "bg-primary/50 scale-75" : "bg-border scale-75"
                }`}
              />
            ))}
          </div>

          <button
            onClick={onComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Skip
          </button>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-24 h-24 rounded-full bg-primary/15 border-2 border-primary/35 flex items-center justify-center glow-teal">
            <span className="text-4xl">🌊</span>
          </div>
          <div>
            <p className="text-xl font-bold">Feeling better?</p>
            <p className="text-sm text-muted-foreground mt-1">You&apos;re ready to surf.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onComplete}
            className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-primary-foreground font-semibold glow-teal"
          >
            Start Session
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
