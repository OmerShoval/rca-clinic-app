"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { EditableLabel, NodeData, handleStyle } from "./shared";

export function FactorNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(20,80,80,0.55)",
        border: `1.5px solid ${selected ? "rgba(47,214,192,0.8)" : "rgba(47,180,160,0.4)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(47,214,192,0.15)" : "0 2px 8px rgba(0,0,0,0.35)",
        minWidth: 130,
        maxWidth: 200,
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <p className="font-display text-[7px] tracking-[0.2em] text-teal mb-1 opacity-60">FACTOR</p>
      <EditableLabel
        value={d.label}
        onChange={(v) => d.onLabelChange?.(v)}
        placeholder="What it includes…"
        className="font-display text-[12px] tracking-wide text-ink leading-snug"
        multiline
      />
    </div>
  );
}
