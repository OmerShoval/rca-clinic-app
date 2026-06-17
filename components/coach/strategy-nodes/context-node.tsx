"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { EditableLabel, NodeData, handleStyle } from "./shared";

export function ContextNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <div
      className="rounded-full px-5 py-2.5 text-center"
      style={{
        background: "rgba(139,92,246,0.18)",
        border: `1.5px solid ${selected ? "rgb(167,139,250)" : "rgba(139,92,246,0.45)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(139,92,246,0.25)" : "0 2px 8px rgba(0,0,0,0.35)",
        minWidth: 120,
      }}
    >
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <EditableLabel
        value={d.label}
        onChange={(v) => d.onLabelChange?.(v)}
        placeholder="Context…"
        className="font-display text-[11px] tracking-widest text-purple-300 whitespace-nowrap"
      />
    </div>
  );
}
