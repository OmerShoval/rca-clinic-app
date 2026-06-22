"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { EditableLabel, NodeData, handleStyle, MediaAttach, WhyField } from "./shared";

export function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  const num = d.number ?? 1;
  const done = d.done ?? false;

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex gap-2.5 items-start"
      style={{
        background: done ? "rgba(30,80,30,0.55)" : "rgba(80,60,10,0.55)",
        border: `1.5px solid ${done ? "rgba(80,200,100,0.6)" : selected ? "rgba(224,182,79,0.9)" : "rgba(224,182,79,0.4)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(224,182,79,0.15)" : "0 2px 8px rgba(0,0,0,0.35)",
        minWidth: 150,
        maxWidth: 220,
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      {/* Done toggle — click to mark step complete/incomplete */}
      <button
        onClick={(e) => { e.stopPropagation(); d.onDoneChange?.(!done); }}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-display text-[10px] text-abyss font-bold transition-all"
        style={{
          background: done ? "rgba(80,200,100,0.85)" : "var(--gold)",
          boxShadow: done ? "0 0 6px rgba(80,200,100,0.4)" : "none",
        }}
        title={done ? "Mark incomplete" : "Mark complete"}
      >
        {done ? "✓" : num}
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[7px] tracking-[0.2em] text-gold opacity-60 mb-0.5">STEP</p>
        <EditableLabel
          value={d.label}
          onChange={(v) => d.onLabelChange?.(v)}
          placeholder="Action to take…"
          className="font-display text-[11px] tracking-wide text-ink leading-snug"
          style={done ? { textDecoration: "line-through", opacity: 0.6 } : undefined}
          multiline
        />
        {done && d.doneAt && (
          <p className="font-display text-[7px] tracking-wide mt-0.5" style={{ color: "rgba(80,200,100,0.7)" }}>
            ✓ {new Date(d.doneAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        )}
        <MediaAttach url={d.url} onUrlChange={(v) => d.onUrlChange?.(v)} onUpload={d.onMediaUpload} />
        <WhyField
          why={d.why}
          whyVisible={d.whyVisible}
          onWhyChange={d.onWhyChange}
          onWhyVisibleChange={d.onWhyVisibleChange}
        />
      </div>
    </div>
  );
}
