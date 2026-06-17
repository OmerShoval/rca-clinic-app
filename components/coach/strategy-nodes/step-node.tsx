"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { EditableLabel, NodeData, handleStyle } from "./shared";

export function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  const num = d.number ?? 1;
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex gap-2.5 items-start"
      style={{
        background: "rgba(80,60,10,0.55)",
        border: `1.5px solid ${selected ? "rgba(224,182,79,0.9)" : "rgba(224,182,79,0.4)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(224,182,79,0.15)" : "0 2px 8px rgba(0,0,0,0.35)",
        minWidth: 150,
        maxWidth: 220,
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-display text-[10px] text-abyss font-bold"
        style={{ background: "var(--gold)" }}
      >
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[7px] tracking-[0.2em] text-gold opacity-60 mb-0.5">STEP</p>
        <EditableLabel
          value={d.label}
          onChange={(v) => d.onLabelChange?.(v)}
          placeholder="Action to take…"
          className="font-display text-[11px] tracking-wide text-ink leading-snug"
          multiline
        />
      </div>
    </div>
  );
}
