"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface DaySessionPickerProps {
  onConfirm: (day: number, session: number) => void;
  onBack: () => void;
}

export function DaySessionPicker({ onConfirm, onBack }: DaySessionPickerProps) {
  const [day, setDay] = useState<number | null>(null);
  const [sessionNum, setSessionNum] = useState<number | null>(null);

  const days = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen gradient-ocean flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-10 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex-1 px-6 pb-10 space-y-8 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold">Select Day</h1>
          <p className="text-sm text-muted-foreground mt-1">Days 1–20 of the clinic</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {days.map((d) => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.9 }}
              onClick={() => { setDay(d); setSessionNum(null); }}
              className={[
                "rounded-xl py-3.5 text-sm font-semibold transition-all",
                day === d
                  ? "bg-primary text-primary-foreground glow-teal-sm"
                  : "bg-card/60 border border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              ].join(" ")}
            >
              {d}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {day && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.28 }}
            >
              <h2 className="text-lg font-semibold mb-1">Session</h2>
              <p className="text-sm text-muted-foreground mb-4">Up to 5 sessions per day</p>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setSessionNum(s)}
                    className={[
                      "flex-1 rounded-2xl py-5 text-base font-bold transition-all",
                      sessionNum === s
                        ? "bg-primary text-primary-foreground glow-teal-sm"
                        : "bg-card/60 border border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {day && sessionNum && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onConfirm(day, sessionNum)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-primary-foreground font-semibold glow-teal"
            >
              Continue to Check-In
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
