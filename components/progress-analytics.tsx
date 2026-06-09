"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, TrendingUp, BookOpen, ChevronDown, ChevronUp, Check, X } from "lucide-react";
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
import { useTheme } from "@/lib/use-theme";
import type { Student } from "@/lib/database.types";

interface DataPoint {
  emotional_state: number;
  success_count: number;
  day: number;
}

interface WaveEntry {
  wave_number: number;
  before_notes: string | null;
  during_notes: string | null;
  after_notes: string | null;
  is_success: boolean | null;
}

interface JournalSession {
  id: string;
  day_number: number;
  session_number: number;
  date: string;
  social_notes: string | null;
  changes_noticed: string | null;
  gratitude_notes: string | null;
  waves: WaveEntry[];
}

interface ProgressAnalyticsProps {
  student: Student;
  onBack: () => void;
}

export function ProgressAnalytics({ student, onBack }: ProgressAnalyticsProps) {
  const { dark } = useTheme();
  const [tab, setTab] = useState<"progress" | "journal">("progress");
  const [data, setData] = useState<DataPoint[]>([]);
  const [journalSessions, setJournalSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const firstName = student.name.split(" ")[0];

  useEffect(() => {
    async function load() {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, day_number, session_number, date, social_notes, changes_noticed, gratitude_notes")
        .eq("student_id", student.id)
        .order("date", { ascending: false })
        .order("session_number", { ascending: false });

      if (!sessions?.length) {
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map((s) => (s as { id: string }).id);

      const [{ data: checkIns }, { data: stats }, { data: waveLogs }] = await Promise.all([
        supabase.from("check_ins").select("session_id, emotional_state").in("session_id", sessionIds),
        supabase.from("daily_stats").select("session_id, success_count").in("session_id", sessionIds),
        supabase.from("wave_logs")
          .select("session_id, wave_number, before_notes, during_notes, after_notes, is_success")
          .in("session_id", sessionIds)
          .order("wave_number"),
      ]);

      /* ── Progress chart data (chronological) ── */
      const chronological = [...sessions].sort((a, b) => {
        const sa = a as { date: string; session_number: number };
        const sb = b as { date: string; session_number: number };
        return sa.date.localeCompare(sb.date) || sa.session_number - sb.session_number;
      });
      const points: DataPoint[] = [];
      for (const s of chronological) {
        const ss = s as { id: string; day_number: number };
        const ci = (checkIns ?? []).find((c) => (c as { session_id: string }).session_id === ss.id);
        const stat = (stats ?? []).find((st) => (st as { session_id: string }).session_id === ss.id);
        if (ci && stat) {
          points.push({
            emotional_state: (ci as { emotional_state: number }).emotional_state,
            success_count: (stat as { success_count: number }).success_count,
            day: ss.day_number,
          });
        }
      }
      setData(points);

      /* ── Journal sessions (reverse-chronological, already sorted) ── */
      const journal: JournalSession[] = (sessions as {
        id: string; day_number: number; session_number: number; date: string;
        social_notes: string | null; changes_noticed: string | null; gratitude_notes: string | null;
      }[]).map((s) => ({
        id: s.id,
        day_number: s.day_number,
        session_number: s.session_number,
        date: s.date,
        social_notes: s.social_notes,
        changes_noticed: s.changes_noticed,
        gratitude_notes: s.gratitude_notes,
        waves: (waveLogs ?? [])
          .filter((w) => (w as { session_id: string }).session_id === s.id)
          .map((w) => ({
            wave_number: (w as WaveEntry & { session_id: string }).wave_number,
            before_notes: (w as WaveEntry & { session_id: string }).before_notes,
            during_notes: (w as WaveEntry & { session_id: string }).during_notes,
            after_notes: (w as WaveEntry & { session_id: string }).after_notes,
            is_success: (w as WaveEntry & { session_id: string }).is_success,
          })),
      })).filter((s) => s.social_notes || s.changes_noticed || s.gratitude_notes || s.waves.length > 0);

      setJournalSessions(journal);
      setLoading(false);
    }
    load();
  }, [student.id]);

  const avgMental =
    data.length > 0
      ? Math.round(data.reduce((a, d) => a + d.emotional_state, 0) / data.length)
      : null;
  const totalSuccess = data.reduce((a, d) => a + d.success_count, 0);

  const tickFill = dark ? "oklch(0.58 0.025 200)" : "oklch(0.42 0.035 200)";
  const tickStyle = { fill: tickFill, fontSize: 11 };
  const gridStroke = dark ? "oklch(1 0 0 / 6%)" : "oklch(0 0 0 / 8%)";
  const tooltipBg = dark ? "oklch(0.15 0.02 210)" : "oklch(0.99 0.004 205)";
  const tooltipBorder = dark ? "1px solid oklch(1 0 0 / 10%)" : "1px solid oklch(0 0 0 / 10%)";
  const tooltipColor = dark ? "oklch(0.93 0.01 80)" : "oklch(0.14 0.025 210)";
  const labelFill = dark ? "oklch(0.48 0.02 200)" : "oklch(0.40 0.03 200)";

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

      <div className="px-6 pb-10 flex-1 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-teal" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{firstName}&apos;s Progress</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your journey in numbers and words</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-border/40 bg-card p-1 gap-1">
          <button
            onClick={() => setTab("progress")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "progress"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Progress
          </button>
          <button
            onClick={() => setTab("journal")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "journal"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Journal
          </button>
        </div>

        {/* Content */}
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
        ) : (
          <AnimatePresence mode="wait">
            {tab === "progress" ? (
              <motion.div
                key="progress"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                {data.length === 0 ? (
                  <EmptyState message="No sessions logged yet" sub="Complete your first session to see your progress here." />
                ) : (
                  <>
                    <div className="rounded-2xl bg-card border border-border/40 px-2 py-6">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium px-4 mb-4">
                        Mental State vs Successes
                      </p>
                      <ResponsiveContainer width="100%" height={260}>
                        <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 30 }}>
                          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" />
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
                              style: { fill: labelFill, fontSize: 10 },
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
                              style: { fill: labelFill, fontSize: 10 },
                            }}
                          />
                          <Tooltip
                            cursor={{ stroke: "oklch(0.68 0.14 188 / 30%)" }}
                            contentStyle={{
                              background: tooltipBg,
                              border: tooltipBorder,
                              borderRadius: "12px",
                              color: tooltipColor,
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
                          <Scatter data={data} fill="oklch(0.68 0.14 188)" fillOpacity={0.9} />
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
              </motion.div>
            ) : (
              <motion.div
                key="journal"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22 }}
                className="space-y-3"
              >
                {journalSessions.length === 0 ? (
                  <EmptyState message="No journal entries yet" sub="After your next session, your reflections will appear here." />
                ) : (
                  journalSessions.map((sess) => (
                    <JournalCard
                      key={sess.id}
                      session={sess}
                      expanded={expandedId === sess.id}
                      onToggle={() => setExpandedId(expandedId === sess.id ? null : sess.id)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function JournalCard({
  session,
  expanded,
  onToggle,
}: {
  session: JournalSession;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasJournal = session.social_notes || session.changes_noticed || session.gratitude_notes;

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">
            Day {session.day_number} · Session {session.session_number}
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {new Date(session.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            {" · "}
            {session.waves.length > 0 ? `${session.waves.length} wave${session.waves.length !== 1 ? "s" : ""}` : "No waves logged"}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-border/30 space-y-4">
              {/* Journal fields */}
              {hasJournal && (
                <div className="space-y-3">
                  {session.social_notes && (
                    <JournalEntry label="The energy" text={session.social_notes} />
                  )}
                  {session.changes_noticed && (
                    <JournalEntry label="What changed" text={session.changes_noticed} />
                  )}
                  {session.gratitude_notes && (
                    <JournalEntry label="Grateful for" text={session.gratitude_notes} />
                  )}
                </div>
              )}

              {/* Waves */}
              {session.waves.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-2">
                    Waves
                  </p>
                  <div className="space-y-2.5">
                    {session.waves.map((wave) => (
                      <div
                        key={wave.wave_number}
                        className="rounded-xl bg-accent/50 border border-border/30 px-4 py-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-card border border-border/40 flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                            {wave.wave_number}
                          </span>
                          {wave.is_success === true && (
                            <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                              <Check className="w-3 h-3" /> Success
                            </span>
                          )}
                          {wave.is_success === false && (
                            <span className="flex items-center gap-1 text-[10px] text-red-400/80 font-medium">
                              <X className="w-3 h-3" /> Learning
                            </span>
                          )}
                        </div>
                        {wave.before_notes && <WaveNote label="Before" text={wave.before_notes} />}
                        {wave.during_notes && <WaveNote label="During" text={wave.during_notes} />}
                        {wave.after_notes && <WaveNote label="After" text={wave.after_notes} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JournalEntry({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl bg-accent/40 border border-border/30 px-4 py-3">
      <p className="text-[10px] text-muted-foreground/55 uppercase tracking-widest font-medium mb-1">{label}</p>
      <p className="text-sm text-foreground/85 leading-relaxed">{text}</p>
    </div>
  );
}

function WaveNote({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[9px] text-muted-foreground/45 uppercase tracking-widest font-medium">{label}</p>
      <p className="text-xs text-foreground/75 mt-0.5 leading-snug">{text}</p>
    </div>
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

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/50 px-6 py-14 text-center">
      <p className="text-2xl mb-3">🌊</p>
      <p className="text-foreground/70 font-medium">{message}</p>
      <p className="text-xs text-muted-foreground/60 mt-1.5">{sub}</p>
    </div>
  );
}
