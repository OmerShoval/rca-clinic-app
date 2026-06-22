"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import React, { useMemo, useState } from "react";

export interface HabitLog {
  log_date: string; // "YYYY-MM-DD"
  completed_habits: string[];
  notes?: string | null;
}

interface HabitHeatmapProps {
  logs: HabitLog[];
  totalHabits: number; // how many habits in the program (to compute %)
  weeks?: number; // how many weeks to show (default 10)
  cardTitle?: string;
  cardDescription?: string;
  className?: string;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function HabitHeatmap({
  logs,
  totalHabits,
  weeks = 10,
  cardTitle = "Habit Consistency",
  cardDescription = "Your training habit over the last 10 weeks.",
  className,
}: HabitHeatmapProps) {
  const [hovered, setHovered] = useState(false);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; total: number } | null>(null);

  // Build a map: "YYYY-MM-DD" → fraction completed (0–1)
  const logMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of logs) {
      const frac = totalHabits > 0 ? Math.min(1, l.completed_habits.length / totalHabits) : (l.completed_habits.length > 0 ? 1 : 0);
      m.set(l.log_date, frac);
    }
    return m;
  }, [logs, totalHabits]);

  // Build grid: cols = weeks, rows = 7 days (Sun–Sat)
  // Start from `weeks` weeks ago (Sunday)
  const cells = useMemo(() => {
    const today = new Date();
    // Find the most recent Sunday
    const dayOfWeek = today.getDay(); // 0=Sun
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - (weeks - 1) * 7);

    const grid: { date: string; frac: number; isFuture: boolean }[][] = [];
    for (let col = 0; col < weeks; col++) {
      const column: { date: string; frac: number; isFuture: boolean }[] = [];
      for (let row = 0; row < 7; row++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + col * 7 + row);
        const iso = d.toISOString().split("T")[0];
        const isFuture = d > today;
        column.push({ date: iso, frac: logMap.get(iso) ?? 0, isFuture });
      }
      grid.push(column);
    }
    return grid;
  }, [logMap, weeks]);

  // Stats
  const stats = useMemo(() => {
    const active = logs.filter((l) => l.completed_habits.length > 0);
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let cur = new Date();
    while (true) {
      const iso = cur.toISOString().split("T")[0];
      if (iso > today) { cur.setDate(cur.getDate() - 1); continue; }
      if (logMap.has(iso) && logMap.get(iso)! > 0) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    return { totalDays: active.length, streak };
  }, [logs, logMap]);

  function cellColor(frac: number, isFuture: boolean): string {
    if (isFuture) return "rgba(255,255,255,0.03)";
    if (frac === 0) return "rgba(47,214,192,0.07)";
    if (frac < 0.34) return "rgba(47,214,192,0.25)";
    if (frac < 0.67) return "rgba(47,214,192,0.5)";
    if (frac < 1) return "rgba(47,214,192,0.75)";
    return "rgba(47,214,192,1)";
  }

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => { setHovered(false); setTooltip(null); }}
      className={cn("relative flex flex-col gap-3 rounded-2xl p-4", className)}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div>
        <p className="font-display text-[8px] tracking-[0.25em] text-teal uppercase">{cardTitle}</p>
        <p className="font-display text-[10px] text-ink-faint mt-0.5">{cardDescription}</p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        <div>
          <p className="font-display text-[18px] text-ink leading-none">{stats.totalDays}</p>
          <p className="font-display text-[8px] tracking-[0.15em] text-ink-faint mt-0.5">ACTIVE DAYS</p>
        </div>
        <div className="h-6 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div>
          <p className="font-display text-[18px] text-teal leading-none">{stats.streak}</p>
          <p className="font-display text-[8px] tracking-[0.15em] text-ink-faint mt-0.5">DAY STREAK</p>
        </div>
      </div>

      {/* Day labels */}
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="h-4 w-3 flex items-center justify-center font-display text-[7px] text-ink-faint">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
          {cells.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1 flex-shrink-0">
              {col.map((cell, ri) => (
                <motion.div
                  key={ri}
                  className="h-4 w-4 rounded-[3px] cursor-pointer"
                  animate={{
                    backgroundColor: cellColor(cell.frac, cell.isFuture),
                    scale: hovered && !cell.isFuture ? 1.08 : 1,
                    boxShadow: cell.frac === 1 && hovered ? "0 0 6px rgba(47,214,192,0.5)" : "none",
                  }}
                  transition={{ duration: 0.25, delay: ci * 0.015 }}
                  onHoverStart={() => !cell.isFuture && setTooltip({ date: cell.date, count: Math.round(cell.frac * totalHabits), total: totalHabits })}
                  onHoverEnd={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-14 left-4 rounded-lg px-2.5 py-1.5 pointer-events-none z-10"
          style={{ background: "rgba(7,15,21,0.92)", border: "1px solid rgba(47,214,192,0.25)" }}
        >
          <p className="font-display text-[9px] text-teal tracking-wide">{tooltip.date}</p>
          <p className="font-display text-[8px] text-ink-faint">{tooltip.count}/{tooltip.total} habits</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5">
        <span className="font-display text-[8px] text-ink-faint">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <div key={i} className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: cellColor(f, false) }} />
        ))}
        <span className="font-display text-[8px] text-ink-faint">More</span>
      </div>
    </motion.div>
  );
}

export default HabitHeatmap;
