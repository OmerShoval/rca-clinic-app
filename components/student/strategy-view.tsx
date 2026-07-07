"use client";

import { motion } from "motion/react";
import { useLanguage } from "@/lib/language-context";
import { VideoSlot } from "@/components/ui/video-slot";
import { VideoThumb } from "@/components/ui/video-thumb";

export interface StrategyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    number?: number;
    url?: string;
    caption?: string;
    why?: string;
    whyVisible?: boolean;
    done?: boolean;
    doneAt?: string;
  };
  style?: { width?: number; height?: number };
}

export interface StrategyEdge {
  id: string;
  source: string;
  target: string;
}

export interface StrategyData {
  nodes: StrategyNode[];
  edges: StrategyEdge[];
}

interface Props {
  strategy: StrategyData | null;
}

function getYoutubeThumbnail(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|webp|svg)(\?|$)/i.test(url);
}

function NodeMedia({ url, caption }: { url: string; caption?: string }) {
  // Still images link out to the full asset.
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption ?? "media"}
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: 140 }}
        />
        {caption && (
          <p className="font-display text-[8px] text-ink-faint mt-0.5 text-center">{caption}</p>
        )}
      </a>
    );
  }
  // Everything playable (Cloudflare, direct/Supabase mp4, .m3u8, YouTube/Vimeo,
  // gif, external link) goes through the one consistent VideoSlot path.
  return (
    <div className="mt-2">
      <VideoSlot url={url} label={caption} />
      {caption && (
        <p className="font-display text-[8px] text-ink-faint mt-0.5 text-center">{caption}</p>
      )}
    </div>
  );
}

export function StrategyView({ strategy }: Props) {
  const { t } = useLanguage();

  if (!strategy || !strategy.nodes?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="text-5xl">🗺</span>
        <p className="font-display text-ink text-xl">{t("strat_empty")}</p>
      </div>
    );
  }

  const { nodes, edges } = strategy;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Connections: source → [target ids]
  const outEdges: Record<string, string[]> = {};
  const inEdges: Record<string, string[]> = {};
  for (const e of edges) {
    (outEdges[e.source] ??= []).push(e.target);
    (inEdges[e.target] ??= []).push(e.source);
  }

  const contextNodes = nodes.filter((n) => n.type === "context");
  const goalNodes = nodes.filter((n) => n.type === "goal");
  const sectionNodes = nodes.filter((n) => n.type === "section");

  // For a given goal, gather all connected nodes by type
  function getConnected(goalId: string, type: string): StrategyNode[] {
    return (outEdges[goalId] ?? [])
      .map((tid) => byId[tid])
      .filter((n) => n?.type === type);
  }

  // Goals that connect to a given goal (reverse edges)
  function getGoalLinks(goalId: string): StrategyNode[] {
    const targets = outEdges[goalId] ?? [];
    return targets.map((tid) => byId[tid]).filter((n) => n?.type === "goal");
  }

  // Section a goal belongs to (by position — goal inside section bounds)
  function getSectionForGoal(goal: StrategyNode): StrategyNode | null {
    for (const sec of sectionNodes) {
      const sw = sec.style?.width ?? 300;
      const sh = sec.style?.height ?? 180;
      if (
        goal.position.x >= sec.position.x &&
        goal.position.x <= sec.position.x + sw &&
        goal.position.y >= sec.position.y &&
        goal.position.y <= sec.position.y + sh
      ) {
        return sec;
      }
    }
    return null;
  }

  // Group goals by section
  const goalsBySectionId: Record<string, StrategyNode[]> = {};
  const ungroupedGoals: StrategyNode[] = [];
  for (const goal of goalNodes) {
    const sec = getSectionForGoal(goal);
    if (sec) {
      (goalsBySectionId[sec.id] ??= []).push(goal);
    } else {
      ungroupedGoals.push(goal);
    }
  }

  function renderGoalCard(goal: StrategyNode, i: number) {
    const factors = getConnected(goal.id, "factor");
    const steps = getConnected(goal.id, "step").sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));
    const medias = getConnected(goal.id, "media");
    const linkedGoals = getGoalLinks(goal.id);

    const doneCount = steps.filter((s) => s.data.done).length;
    const totalSteps = steps.length;
    const allDone = totalSteps > 0 && doneCount === totalSteps;
    const progressPct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;

    return (
      <motion.div
        key={goal.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: i * 0.06 }}
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: allDone ? "rgba(20,60,30,0.45)" : "rgba(20,50,100,0.4)",
          border: `1.5px solid ${allDone ? "rgba(80,200,100,0.45)" : "rgba(60,120,200,0.3)"}`,
          borderInlineStart: `4px solid ${allDone ? "rgba(80,200,100,0.85)" : "rgba(80,140,220,0.8)"}`,
          boxShadow: allDone ? "0 0 16px rgba(80,200,100,0.08)" : "none",
        }}
      >
        <div>
          <p className="font-display text-[8px] tracking-[0.25em] text-blue-400 opacity-60 mb-1">{t("strat_goal")}</p>
          <p className="font-display text-[17px] tracking-wide text-ink font-bold leading-snug">{goal.data.label}</p>
          {goal.data.why && goal.data.whyVisible && (
            <p className="font-display text-[10px] tracking-wide mt-1" style={{ color: "rgba(224,182,79,0.7)", fontStyle: "italic" }}>
              Why: {goal.data.why}
            </p>
          )}
          {goal.data.url && <NodeMedia url={goal.data.url} caption={goal.data.caption} />}
        </div>

        {factors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {factors.map((f) => (
              <span
                key={f.id}
                className="font-display text-[10px] tracking-wide text-teal px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(47,214,192,0.12)", border: "1px solid rgba(47,214,192,0.25)" }}
              >
                {f.data.label}
                {f.data.why && f.data.whyVisible && (
                  <span className="ms-1 opacity-60" style={{ fontStyle: "italic" }}>· {f.data.why}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {steps.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: allDone ? "rgba(80,200,100,0.7)" : "var(--gold)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="font-display text-[8px] tracking-wide flex-shrink-0" style={{ color: allDone ? "rgba(80,200,100,0.8)" : "var(--gold)", opacity: 0.8 }}>
                {doneCount}/{totalSteps}
              </span>
            </div>

            {steps.map((s) => {
              const isDone = s.data.done ?? false;
              return (
                <div key={s.id} className="flex flex-col gap-1">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-display text-[9px] text-abyss font-bold"
                      style={{ background: isDone ? "rgba(80,200,100,0.85)" : "var(--gold)" }}
                    >
                      {isDone ? "✓" : (s.data.number ?? "·")}
                    </div>
                    <div className="flex-1">
                      <p
                        className="font-display text-[12px] tracking-wide text-ink leading-snug pt-0.5"
                        style={isDone ? { textDecoration: "line-through", opacity: 0.6 } : undefined}
                      >
                        {s.data.label}
                      </p>
                      {isDone && s.data.doneAt && (
                        <p className="font-display text-[8px] tracking-wide" style={{ color: "rgba(80,200,100,0.7)" }}>
                          Done {new Date(s.data.doneAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      {s.data.why && s.data.whyVisible && (
                        <p className="font-display text-[9px] tracking-wide mt-0.5" style={{ color: "rgba(224,182,79,0.65)", fontStyle: "italic" }}>
                          Why: {s.data.why}
                        </p>
                      )}
                    </div>
                  </div>
                  {s.data.url && <NodeMedia url={s.data.url} caption={s.data.caption} />}
                </div>
              );
            })}
          </div>
        )}

        {medias.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {medias.map((m) => {
              if (!m.data.url) return null;
              // Still images: link out to the full-size asset.
              if (isImageUrl(m.data.url)) {
                return (
                  <a key={m.id} href={m.data.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.data.url} alt={m.data.caption ?? "media"} className="w-24 h-16 object-cover rounded-lg" />
                    {m.data.caption && <p className="font-display text-[8px] text-ink-faint text-center">{m.data.caption}</p>}
                  </a>
                );
              }
              // Playable media: a VideoThumb preview that links out. YouTube gets
              // its own still via the call-site helper (lib/video has no YT thumb).
              return (
                <a key={m.id} href={m.data.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1">
                  <VideoThumb
                    url={m.data.url}
                    posterUrl={getYoutubeThumbnail(m.data.url)}
                    label={m.data.caption}
                    height={120}
                    className="w-40 rounded-lg"
                  />
                  {m.data.caption && <p className="font-display text-[8px] text-ink-faint text-center">{m.data.caption}</p>}
                </a>
              );
            })}
          </div>
        )}

        {linkedGoals.length > 0 && (
          <p className="font-display text-[9px] tracking-wide text-ink-faint">
            {t("strat_connects_to")}: {linkedGoals.map((g) => g.data.label).join(", ")}
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Context pill(s) */}
      {contextNodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contextNodes.map((c) => (
            <span
              key={c.id}
              className="font-display text-[10px] tracking-[0.2em] px-4 py-2 rounded-full"
              style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.4)", color: "rgb(167,139,250)" }}
            >
              {c.data.label}
            </span>
          ))}
        </div>
      )}

      {/* Sections with goals */}
      {sectionNodes.map((sec) => {
        const sgoals = goalsBySectionId[sec.id] ?? [];
        if (!sgoals.length) return null;
        return (
          <div key={sec.id} className="flex flex-col gap-3">
            <p className="font-display text-[9px] tracking-[0.25em] text-ink-faint uppercase px-1">{sec.data.label}</p>
            {sgoals.map((g, i) => renderGoalCard(g, i))}
          </div>
        );
      })}

      {/* Ungrouped goals */}
      {ungroupedGoals.map((g, i) => renderGoalCard(g, i))}
    </div>
  );
}
