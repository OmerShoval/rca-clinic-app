"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, TrendingUp } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import type { Student } from "@/lib/database.types";

interface DataPoint {
  emotional_state: number;
  success_count: number;
  day: number;
}

interface ProgressAnalyticsProps {
  student: Student;
  onBack: () => void;
}

export function ProgressAnalytics({ student, onBack }: ProgressAnalyticsProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const firstName = student.name.split(" ")[0];

  useEffect(() => {
    async function load() {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, day_number")
        .eq("student_id", student.id);

      if (!sessions?.length) {
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map((s) => s.id);

      const [{ data: checkIns }, { data: stats }] = await Promise.all([
        supabase
          .from("check_ins")
          .select("session_id, emotional_state")
          .in("session_id", sessionIds),
        supabase
          .from("daily_stats")
          .select("session_id, success_count")
          .in("session_id", sessionIds),
      ]);

      const points: DataPoint[] = [];
      for (const s of sessions) {
        const ci = checkIns?.find((c) => c.session_id === s.id);
        const stat = stats?.find((st) => st.session_id === s.id);
        if (ci && stat) {
          points.push({
            emotional_state: ci.emotional_state,
            success_count: stat.success_count,
            day: s.day_number,
          });
        }
      }
      setData(points);
      setLoading(false);
    }
    load();
  }, [student.id]);

  const avgMental =
    data.length > 0
      ? Math.round(data.reduce((a, d) => a + d.emotional_state, 0) / data.length)
      : null;

  const totalSuccess = data.reduce((a, d) => a + d.success_count, 0);

  const tickStyle = { fill: "oklch(0.58 0.025 200)", fontSize: 11 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
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
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Progress</span>
      </div>

      <div className="px-6 pb-10 flex-1 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-teal" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{firstName}&apos;s Progress</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Mood vs wave success rate</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="text-sm text-muted-foreground"
            >
              Loading...
            </motion.div>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 px-6 py-14 text-center">
            <p className="text-2xl mb-3">🌊</p>
            <p className="text-foreground/70 font-medium">No sessions logged yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              Complete your first session to see your progress here.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-card border border-border/40 px-2 py-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium px-4 mb-4">
                Mental State vs Successes
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 30 }}>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" strokeDasharray="4 4" />
                  <XAxis
                    type="number"
                    dataKey="emotional_state"
                    domain={[0, 100]}
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Mental State (0–100)",
                      position: "insideBottom",
                      offset: -18,
                      style: { fill: "oklch(0.48 0.02 200)", fontSize: 10 },
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="success_count"
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    label={{
                      value: "Successes",
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      style: { fill: "oklch(0.48 0.02 200)", fontSize: 10 },
                    }}
                  />
                  <Tooltip
                    cursor={{ stroke: "oklch(0.68 0.14 188 / 30%)" }}
                    contentStyle={{
                      background: "oklch(0.15 0.02 210)",
                      border: "1px solid oklch(1 0 0 / 10%)",
                      borderRadius: "12px",
                      color: "oklch(0.93 0.01 80)",
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [
                      value,
                      name === "emotional_state" ? "Mental State" : "Successes",
                    ]}
                    labelFormatter={(_: unknown, payload: readonly { payload?: DataPoint }[]) =>
                      payload?.[0] ? `Day ${payload[0].payload?.day}` : ""
                    }
                  />
                  <Scatter
                    data={data}
                    fill="oklch(0.68 0.14 188)"
                    fillOpacity={0.9}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Sessions" value={data.length} />
              <StatCard label="Avg Mental" value={`${avgMental}%`} />
              <StatCard label="Total Wins" value={totalSuccess} />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 px-3 py-4 text-center">
      <p className="text-xl font-bold text-teal">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
