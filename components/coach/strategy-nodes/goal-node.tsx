"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { EditableLabel, NodeData, handleStyle } from "./shared";

export function GoalNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: "rgba(30,80,140,0.55)",
        border: `1.5px solid ${selected ? "rgba(80,160,255,0.8)" : "rgba(80,140,220,0.45)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(80,140,255,0.2)" : "0 3px 12px rgba(0,0,0,0.4)",
        minWidth: 160,
        maxWidth: 240,
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <p className="font-display text-[8px] tracking-[0.25em] text-blue-300 mb-1 opacity-70">GOAL</p>
      <EditableLabel
        value={d.label}
        onChange={(v) => d.onLabelChange?.(v)}
        placeholder="What they want…"
        className="font-display text-[13px] tracking-wide text-ink font-bold leading-tight"
        multiline
      />
    </div>
  );
}
