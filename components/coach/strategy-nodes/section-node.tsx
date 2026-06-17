"use client";

import { NodeProps, NodeResizer } from "@xyflow/react";
import { EditableLabel, NodeData } from "./shared";

export function SectionNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <div
      className="w-full h-full rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1.5px dashed ${selected ? "rgba(224,182,79,0.6)" : "rgba(255,255,255,0.15)"}`,
      }}
    >
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderColor: "rgba(224,182,79,0.4)" }}
        handleStyle={{ background: "var(--gold)", width: 8, height: 8, borderRadius: 2 }}
      />
      <div className="px-3 py-2">
        <EditableLabel
          value={d.label}
          onChange={(v) => d.onLabelChange?.(v)}
          placeholder="Section name…"
          className="font-display text-[9px] tracking-[0.25em] text-ink-faint uppercase"
        />
      </div>
    </div>
  );
}
