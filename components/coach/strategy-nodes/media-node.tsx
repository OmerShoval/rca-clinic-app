"use client";

import { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NodeData, EditableLabel, handleStyle } from "./shared";

function getYoutubeThumbnail(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function isImageUrl(url: string) {
  return /\.(gif|jpe?g|png|webp|svg)(\?|$)/i.test(url);
}

export function MediaNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  const [urlInput, setUrlInput] = useState(d.url ?? "");
  const [confirmed, setConfirmed] = useState(!!(d.url));

  const thumb = d.url
    ? (getYoutubeThumbnail(d.url) ?? (isImageUrl(d.url) ? d.url : null))
    : null;

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

      {/* Media preview */}
      {thumb ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt={d.caption ?? "media"} className="w-full h-32 object-cover" />
          {getYoutubeThumbnail(d.url ?? "") && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white text-lg">▶</div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
          {!confirmed ? (
            <div className="flex gap-1 px-2 w-full" onClick={(e) => e.stopPropagation()}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { d.onUrlChange?.(urlInput); setConfirmed(true); } }}
                placeholder="Paste GIF / image / YouTube URL"
                className="flex-1 bg-transparent text-ink text-[10px] outline-none placeholder:text-ink-faint"
              />
              <button
                onClick={() => { d.onUrlChange?.(urlInput); setConfirmed(true); }}
                className="font-display text-[9px] text-gold px-1.5 py-0.5 rounded"
                style={{ background: "var(--gold-soft)" }}
              >
                ✓
              </button>
            </div>
          ) : (
            <span className="font-display text-[9px] text-ink-faint">No preview</span>
          )}
        </div>
      )}

      {/* Caption + URL change */}
      <div className="px-3 py-2">
        <p className="font-display text-[7px] tracking-[0.2em] text-ink-faint opacity-50 mb-1">MEDIA</p>
        <EditableLabel
          value={d.caption ?? ""}
          onChange={(v) => d.onCaptionChange?.(v)}
          placeholder="Add caption…"
          className="font-display text-[10px] text-ink leading-snug"
        />
        {confirmed && (
          <button
            onClick={() => { setConfirmed(false); setUrlInput(d.url ?? ""); }}
            className="font-display text-[8px] text-ink-faint mt-1 hover:text-gold transition-colors"
          >
            ↺ change URL
          </button>
        )}
      </div>
    </div>
  );
}
