"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { NodeData, EditableLabel, handleStyle, MediaAttach } from "./shared";

export function MediaNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as NodeData;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(15,20,30,0.8)",
        border: `1.5px solid ${selected ? "rgba(224,182,79,0.7)" : "rgba(255,255,255,0.12)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(224,182,79,0.1)" : "0 3px 12px rgba(0,0,0,0.5)",
        minWidth: 180,
        maxWidth: 240,
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />

      {/* Caption + media surface (upload / library / paste) */}
      <div className="px-3 py-2.5">
        <p className="font-display text-[7px] tracking-[0.2em] text-ink-faint opacity-50 mb-1">MEDIA</p>
        <EditableLabel
          value={d.caption ?? ""}
          onChange={(v) => d.onCaptionChange?.(v)}
          placeholder="Add caption…"
          className="font-display text-[10px] text-ink leading-snug"
        />

        {/* MediaAttach renders the preview + remove when a URL is set, and the
            upload / library / paste tabs when empty — one surface for all cases. */}
        <MediaAttach
          url={d.url}
          onUrlChange={(v) => d.onUrlChange?.(v)}
          onUpload={d.onMediaUpload}
          studentId={d.studentId}
          studentSlug={d.studentSlug}
          studentName={d.studentName}
          sourceType="strategy_node"
          sourceId={id}
          label={d.caption || d.label}
        />
      </div>
    </div>
  );
}
