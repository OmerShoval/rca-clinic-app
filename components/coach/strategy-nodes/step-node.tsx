"use client";

import { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { EditableLabel, NodeData, SubStep, handleStyle, MediaAttach, WhyField } from "./shared";

// ── Sub-step library picker ───────────────────────────────────────────────────

interface LibraryVideo {
  id: string;
  video_url: string;
  label: string;
}

function cfThumb(url: string): string | null {
  const m = url.match(/videodelivery\.net\/([a-f0-9]{32,})/);
  return m ? `https://videodelivery.net/${m[1]}/thumbnails/thumbnail.jpg?time=1s&height=60` : null;
}

function SubStepLibPicker({
  studentId,
  onSelect,
}: {
  studentId: string;
  onSelect: (url: string) => void;
}) {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    fetch(`/api/coach/students/${studentId}/videos`)
      .then((r) => r.json())
      .then((d: LibraryVideo[]) => setVideos(Array.isArray(d) ? d : []))
      .finally(() => setLoaded(true));
  }, [loaded, studentId]);

  if (!loaded) return (
    <div className="flex justify-center py-2">
      <div className="w-3 h-3 rounded-full border border-gold border-t-transparent animate-spin" />
    </div>
  );

  if (videos.length === 0) return (
    <p className="font-display text-[7px] text-ink-faint text-center py-2">No videos yet</p>
  );

  return (
    <div className="grid gap-1 overflow-y-auto" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxHeight: 100 }}>
      {videos.map((v) => {
        const t = cfThumb(v.video_url);
        return (
          <button
            key={v.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(v.video_url); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded overflow-hidden text-left transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {t
              ? <img src={t} alt={v.label} className="w-full object-cover block" style={{ height: 30 }} /> // eslint-disable-line @next/next/no-img-element
              : <div className="w-full flex items-center justify-center" style={{ height: 30, fontSize: 12 }}>🎬</div>
            }
            <p className="font-display text-[6px] tracking-wide text-ink px-1 py-0.5 truncate">{v.label || "Video"}</p>
          </button>
        );
      })}
    </div>
  );
}

// ── Sub-step row ──────────────────────────────────────────────────────────────

function SubStepRow({
  substep,
  studentId,
  onChange,
  onRemove,
}: {
  substep: SubStep;
  studentId?: string;
  onChange: (updated: SubStep) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(!substep.label);
  const [draft, setDraft] = useState(substep.label);
  const [libOpen, setLibOpen] = useState(false);
  const thumb = substep.videoUrl ? cfThumb(substep.videoUrl) : null;

  function commitLabel() {
    setEditing(false);
    if (draft.trim() !== substep.label) onChange({ ...substep, label: draft.trim() || substep.label });
  }

  function toggleDone(e: React.MouseEvent) {
    e.stopPropagation();
    const done = !substep.done;
    onChange({ ...substep, done, doneAt: done ? new Date().toISOString() : undefined });
  }

  return (
    <div
      className="rounded-lg px-2 py-1.5 flex flex-col gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-1.5">
        {/* Done toggle */}
        <button
          onClick={toggleDone}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 transition-all relative after:absolute after:-inset-3"
          style={{
            background: substep.done ? "rgba(80,200,100,0.85)" : "transparent",
            border: substep.done ? "none" : "1.5px solid rgba(255,255,255,0.3)",
          }}
        >
          {substep.done && <span style={{ fontSize: 7, color: "#fff" }}>✓</span>}
        </button>

        {/* Label */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commitLabel(); if (e.key === "Escape") { setDraft(substep.label); setEditing(false); } }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Sub-step…"
              className="w-full bg-transparent outline-none font-display text-[9px] tracking-wide text-ink"
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setDraft(substep.label); setEditing(true); }}
              className="font-display text-[9px] tracking-wide text-ink block cursor-text select-none"
              style={substep.done ? { textDecoration: "line-through", opacity: 0.5 } : undefined}
              title="Double-click to edit"
            >
              {substep.label || <span className="opacity-40">Sub-step…</span>}
            </span>
          )}
        </div>

        {/* Video button */}
        {studentId && (
          <button
            onClick={(e) => { e.stopPropagation(); setLibOpen((o) => !o); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-shrink-0 rounded px-1 py-0.5 font-display text-[7px] tracking-widest transition-all relative after:absolute after:-inset-2"
            style={substep.videoUrl
              ? { background: "rgba(224,182,79,0.2)", color: "var(--gold)", border: "1px solid rgba(224,182,79,0.35)" }
              : { background: "rgba(255,255,255,0.06)", color: "var(--ink-faint)", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            {substep.videoUrl ? "🎬" : "+ vid"}
          </button>
        )}

        {/* Remove */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 font-display text-[9px] text-coral hover:opacity-70 transition-opacity relative after:absolute after:-inset-2.5"
        >
          ✕
        </button>
      </div>

      {/* Thumbnail */}
      {thumb && !libOpen && (
        <div className="ml-5.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="substep video" className="rounded w-full object-cover" style={{ maxHeight: 40 }} />
        </div>
      )}

      {/* Library picker */}
      {libOpen && studentId && (
        <div className="mt-1 ml-5.5" onMouseDown={(e) => e.stopPropagation()}>
          {substep.videoUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange({ ...substep, videoUrl: undefined }); setLibOpen(false); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="font-display text-[7px] tracking-widest text-coral mb-1 hover:opacity-70"
            >
              ✕ Remove video
            </button>
          )}
          <SubStepLibPicker
            studentId={studentId}
            onSelect={(url) => { onChange({ ...substep, videoUrl: url }); setLibOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

// ── Step node ─────────────────────────────────────────────────────────────────

export function StepNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  const num = d.number ?? 1;
  const done = d.done ?? false;
  const feltItCount = d.feltItCount ?? 0;
  const substeps: SubStep[] = d.substeps ?? [];
  const [substepsOpen, setSubstepsOpen] = useState(substeps.length > 0);

  function uid() { return Math.random().toString(36).slice(2, 9); }

  function addSubstep(e: React.MouseEvent) {
    e.stopPropagation();
    const next = [...substeps, { id: uid(), label: "", done: false }];
    d.onSubstepsChange?.(next);
    setSubstepsOpen(true);
  }

  function updateSubstep(idx: number, updated: SubStep) {
    const next = substeps.map((s, i) => (i === idx ? updated : s));
    d.onSubstepsChange?.(next);
  }

  function removeSubstep(idx: number) {
    const next = substeps.filter((_, i) => i !== idx);
    d.onSubstepsChange?.(next);
    if (next.length === 0) setSubstepsOpen(false);
  }

  const doneSubsteps = substeps.filter((s) => s.done).length;

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex gap-2.5 items-start"
      style={{
        background: done ? "rgba(30,80,30,0.55)" : "rgba(80,60,10,0.55)",
        border: `1.5px solid ${done ? "rgba(80,200,100,0.6)" : selected ? "rgba(224,182,79,0.9)" : "rgba(224,182,79,0.4)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(224,182,79,0.15)" : "0 2px 8px rgba(0,0,0,0.35)",
        minWidth: 160,
        maxWidth: 240,
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />

      {/* Done toggle + felt-it badge */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); d.onDoneChange?.(!done); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded-full flex items-center justify-center font-display text-[10px] text-abyss font-bold transition-all"
          style={{
            background: done ? "rgba(80,200,100,0.85)" : "var(--gold)",
            boxShadow: done ? "0 0 6px rgba(80,200,100,0.4)" : "none",
          }}
          title={done ? "Mark incomplete" : "Mark complete"}
        >
          {done ? "✓" : num}
        </button>
        {feltItCount > 0 && (
          <div
            title={`${feltItCount} "I felt it" ${feltItCount === 1 ? "note" : "notes"} from student`}
            className="flex items-center justify-center rounded-full font-display font-bold"
            style={{ width: 14, height: 14, fontSize: 7, background: "rgba(255,107,94,0.2)", border: "1px solid rgba(255,107,94,0.5)", color: "var(--coral)" }}
          >
            {feltItCount > 9 ? "9+" : feltItCount}
          </div>
        )}
      </div>

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

        <MediaAttach url={d.url} onUrlChange={(v) => d.onUrlChange?.(v)} onUpload={d.onMediaUpload} studentId={d.studentId} studentSlug={d.studentSlug} studentName={d.studentName} sourceType="strategy_node" sourceId={id} label={d.label} />
        <WhyField why={d.why} whyVisible={d.whyVisible} onWhyChange={d.onWhyChange} onWhyVisibleChange={d.onWhyVisibleChange} />

        {/* ── Sub-steps ── */}
        <div className="mt-2" onMouseDown={(e) => e.stopPropagation()}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            {substeps.length > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); setSubstepsOpen((o) => !o); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1 font-display text-[7px] tracking-[0.15em] transition-opacity hover:opacity-80"
                style={{ color: "rgba(224,182,79,0.7)" }}
              >
                <span style={{ display: "inline-block", transform: substepsOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", fontSize: 7 }}>▸</span>
                SUB-STEPS {doneSubsteps}/{substeps.length}
              </button>
            ) : (
              <span className="font-display text-[7px] tracking-[0.15em] opacity-40" style={{ color: "var(--gold)" }}>SUB-STEPS</span>
            )}
            <button
              onClick={addSubstep}
              onMouseDown={(e) => e.stopPropagation()}
              className="font-display text-[7px] tracking-widest transition-all rounded px-1.5 py-0.5 hover:opacity-80"
              style={{ background: "rgba(224,182,79,0.12)", color: "var(--gold)", border: "1px solid rgba(224,182,79,0.25)" }}
            >
              + Add
            </button>
          </div>

          {/* Sub-step list */}
          {substepsOpen && substeps.length > 0 && (
            <div className="flex flex-col gap-1">
              {/* Mini progress bar */}
              {substeps.length > 1 && (
                <div className="h-0.5 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round((doneSubsteps / substeps.length) * 100)}%`, background: "rgba(80,200,100,0.7)" }}
                  />
                </div>
              )}
              {substeps.map((ss, idx) => (
                <SubStepRow
                  key={ss.id}
                  substep={ss}
                  studentId={d.studentId}
                  onChange={(updated) => updateSubstep(idx, updated)}
                  onRemove={() => removeSubstep(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
