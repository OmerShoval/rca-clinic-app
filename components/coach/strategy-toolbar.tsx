"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";

export type NodeType = "context" | "goal" | "factor" | "step" | "media" | "section";

const NODE_OPTIONS: { type: NodeType; label: string; shortcut: string; color: string }[] = [
  { type: "context", label: "Context", shortcut: "C", color: "rgba(139,92,246,0.85)" },
  { type: "goal", label: "Goal", shortcut: "G", color: "rgba(59,130,246,0.85)" },
  { type: "factor", label: "Factor", shortcut: "F", color: "rgba(47,214,192,0.85)" },
  { type: "step", label: "Step", shortcut: "S", color: "rgba(224,182,79,0.95)" },
  { type: "media", label: "Media", shortcut: "M", color: "rgba(156,163,175,0.85)" },
  { type: "section", label: "Section", shortcut: "N", color: "rgba(255,255,255,0.25)" },
];

interface Props {
  onAdd: (type: NodeType) => void;
  saving: boolean;
}

export function StrategyToolbar({ onAdd, saving }: Props) {
  const [open, setOpen] = useState(false);
  const { fitView } = useReactFlow();

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
      {/* Add node */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-display text-[11px] tracking-widest text-abyss transition-all"
          style={{ background: "var(--gold)", boxShadow: "0 2px 12px rgba(224,182,79,0.35)" }}
        >
          + Add Node
        </button>

        {open && (
          <div
            className="absolute bottom-full mb-2 left-0 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl"
            style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)", minWidth: 180 }}
          >
            <p className="font-display text-[8px] tracking-[0.2em] text-ink-faint px-2 pt-1 pb-0.5">
              or double-click canvas
            </p>
            {NODE_OPTIONS.map(({ type, label, shortcut, color }) => (
              <button
                key={type}
                onClick={() => { onAdd(type); setOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-left hover:opacity-80 transition-opacity"
                style={{ background: "var(--glass)" }}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="font-display text-[11px] tracking-wide text-ink flex-1">{label}</span>
                <span className="font-display text-[9px] text-ink-faint opacity-60">{shortcut}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fit view */}
      <button
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        className="px-3 py-2 rounded-full font-display text-[10px] tracking-widest text-ink-faint transition-all hover:text-ink"
        style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
        title="Fit view"
      >
        ⊞
      </button>

      {/* Save indicator */}
      {saving && (
        <span className="font-display text-[9px] tracking-widest text-ink-faint animate-pulse">saving…</span>
      )}
    </div>
  );
}
