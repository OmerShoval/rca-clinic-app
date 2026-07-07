"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { EditableLabel, NodeData, handleStyle, MediaAttach, WhyField } from "./shared";

export function GoalNode({ id, data, selected }: NodeProps) {
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
      <MediaAttach
        url={d.url}
        onUrlChange={(v) => d.onUrlChange?.(v)}
        onUpload={d.onMediaUpload}
        studentId={d.studentId}
        studentSlug={d.studentSlug}
        studentName={d.studentName}
        sourceType="strategy_node"
        sourceId={id}
        label={d.label}
      />
      <WhyField
        why={d.why}
        whyVisible={d.whyVisible}
        onWhyChange={d.onWhyChange}
        onWhyVisibleChange={d.onWhyVisibleChange}
      />
      {d.onAddStep && (
        <button
          onClick={(e) => { e.stopPropagation(); d.onAddStep?.(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-1 font-display text-[8px] tracking-widest transition-opacity hover:opacity-80"
          style={{ color: "var(--gold)", opacity: 0.7 }}
        >
          + step
        </button>
      )}
    </div>
  );
}
