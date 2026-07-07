"use client";
import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface Exercise {
  icon: string; // emoji or lucide icon name
  name: string;
  detail: string;
}

export interface WorkoutCardProps {
  date?: string;
  wodTitle?: string;
  sessionTitle: string;
  sessionDuration: number;
  exercises: Exercise[];
  className?: string;
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 14 },
  },
};

export const WorkoutCard = React.forwardRef<HTMLDivElement, WorkoutCardProps>(
  ({ date, wodTitle = "TODAY'S PROGRAM", sessionTitle, sessionDuration, exercises, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full rounded-3xl p-2.5", className)}
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {date && (
          <div className="text-center mb-1">
            <p className="font-display text-[10px] tracking-[0.25em] text-ink-faint uppercase">{date}</p>
          </div>
        )}
        <p className="font-display text-[10px] tracking-[0.3em] text-teal text-center mb-1">{wodTitle}</p>

        <div className="w-full rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-ink leading-none min-w-0 break-words" style={{ fontSize: 16 }}>{sessionTitle}</h3>
            <div
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-display text-[10px] tracking-[0.12em] text-ink-faint"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {sessionDuration} min
            </div>
          </div>

          <motion.ul role="list" className="space-y-2.5" initial="hidden" animate="visible" variants={listVariants}>
            {exercises.map((ex, i) => (
              <motion.li
                key={i}
                role="listitem"
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                variants={itemVariants}
              >
                <div
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-lg leading-none"
                  style={{ background: "rgba(47,214,192,0.12)" }}
                >
                  {ex.icon}
                </div>
                <div>
                  <p className="font-display text-[12px] tracking-wide text-ink">{ex.name}</p>
                  <p className="font-display text-[10px] text-ink-faint mt-0.5">{ex.detail}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    );
  }
);

WorkoutCard.displayName = "WorkoutCard";
