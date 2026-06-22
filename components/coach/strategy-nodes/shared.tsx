"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { VideoTrimModal } from "@/components/ui/video-trim-modal";

export interface NodeData {
  label: string;
  number?: number;
  url?: string;
  caption?: string;
  // Why field
  why?: string;
  whyVisible?: boolean;
  // Step completion
  done?: boolean;
  doneAt?: string;
  // Callbacks
  onLabelChange?: (label: string) => void;
  onUrlChange?: (url: string) => void;
  onCaptionChange?: (caption: string) => void;
  onMediaUpload?: (file: File) => Promise<string>;
  onWhyChange?: (v: string) => void;
  onWhyVisibleChange?: (v: boolean) => void;
  onDoneChange?: (done: boolean) => void;
  onAddStep?: () => void;
}

export function EditableLabel({
  value,
  onChange,
  placeholder,
  className,
  style,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) onChange(draft.trim() || value);
  }

  function onKey(e: KeyboardEvent) {
    // Stop ReactFlow from consuming keystrokes (e.g. Delete = delete node)
    e.stopPropagation();
    if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  }

  if (!editing) {
    return (
      <span
        onDoubleClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
        className={`cursor-text select-none block ${className ?? ""}`}
        style={style}
        title="Double-click to edit"
      >
        {value || <span className="opacity-40">{placeholder}</span>}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        rows={3}
        className={`bg-transparent outline-none resize-none w-full ${className ?? ""}`}
        style={style}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
      onMouseDown={(e) => e.stopPropagation()}
      placeholder={placeholder}
      className={`bg-transparent outline-none w-full ${className ?? ""}`}
      style={style}
    />
  );
}

export const handleStyle = {
  width: 10,
  height: 10,
  background: "rgba(224,182,79,0.7)",
  border: "1px solid rgba(224,182,79,0.4)",
  borderRadius: "50%",
};

// ── MediaAttach ────────────────────────────────────────────────────────────────
// Inline photo / GIF / YouTube attachment for any node type.

function getYtThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function isImgOrGif(url: string) {
  return /\.(gif|jpe?g|png|webp|svg)(\?|$)/i.test(url);
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
}

// ── WhyField ───────────────────────────────────────────────────────────────────
// Collapsible "WHY" text input for nodes.

export function WhyField({
  why,
  whyVisible,
  onWhyChange,
  onWhyVisibleChange,
}: {
  why?: string;
  whyVisible?: boolean;
  onWhyChange?: (v: string) => void;
  onWhyVisibleChange?: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState(why ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (whyVisible) ref.current?.focus();
  }, [whyVisible]);

  function stopAll(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  function commit() {
    if (draft.trim() !== (why ?? "")) onWhyChange?.(draft.trim());
  }

  return (
    <div className="mt-1" onClick={stopAll} onMouseDown={stopAll}>
      <button
        onClick={(e) => { e.stopPropagation(); onWhyVisibleChange?.(!whyVisible); }}
        className="flex items-center gap-1 font-display text-[8px] tracking-[0.15em] transition-opacity hover:opacity-80"
        style={{ color: whyVisible ? "var(--gold)" : "var(--ink-faint)", opacity: whyVisible ? 1 : 0.5 }}
      >
        <span style={{ fontSize: 8 }}>▸</span>
        WHY
      </button>
      {whyVisible && (
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") { setDraft(why ?? ""); onWhyVisibleChange?.(false); }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Why this matters…"
          rows={2}
          className="mt-1 w-full bg-transparent outline-none resize-none font-display text-[9px] tracking-wide leading-snug"
          style={{ color: "var(--gold)", borderBottom: "1px solid rgba(224,182,79,0.25)", paddingBottom: 2 }}
        />
      )}
    </div>
  );
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

export function MediaAttach({
  url,
  onUrlChange,
  onUpload,
}: {
  url?: string;
  onUrlChange?: (url: string) => void;
  onUpload?: (file: File) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [trimmingFile, setTrimmingFile] = useState<File | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) urlInputRef.current?.focus();
  }, [open]);

  async function handleFile(file: File) {
    if (!onUpload) return;
    // Video files go through the trim modal first
    if (isVideoFile(file)) {
      setIsDragging(false);
      setTrimmingFile(file);
      return;
    }
    setUploading(true);
    setIsDragging(false);
    try {
      const uploaded = await onUpload(file);
      onUrlChange?.(uploaded);
      setOpen(false);
    } catch {
      // upload failed — stay open so user can retry
    } finally {
      setUploading(false);
    }
  }

  async function handleTrimmedFile(file: File) {
    if (!onUpload) return;
    setTrimmingFile(null);
    setUploading(true);
    setOpen(false);
    try {
      const uploaded = await onUpload(file);
      onUrlChange?.(uploaded);
    } catch {
      setOpen(true);
    } finally {
      setUploading(false);
    }
  }

  function stopAll(e: React.SyntheticEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  function confirmUrl() {
    const trimmed = urlDraft.trim();
    if (trimmed) { onUrlChange?.(trimmed); setOpen(false); setUrlDraft(""); }
  }

  // ── Trim modal (video files) — full-screen portal ──
  if (trimmingFile) {
    return (
      <VideoTrimModal
        file={trimmingFile}
        onConfirm={handleTrimmedFile}
        onCancel={() => setTrimmingFile(null)}
      />
    );
  }

  // ── Has URL: thumbnail / video / remove ──
  if (url) {
    const thumb = getYtThumb(url) ?? (isImgOrGif(url) ? url : null);
    return (
      <div
        className="mt-2 rounded-lg overflow-hidden relative"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={stopAll}
        onMouseDown={stopAll}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="media" className="w-full h-20 object-cover block" />
        ) : isVideoUrl(url) ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={url}
            controls
            className="w-full block rounded-lg"
            style={{ maxHeight: 120 }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="h-10 flex items-center justify-center font-display text-[9px] text-ink-faint"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            🎬 video attached
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onUrlChange?.(""); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-white"
          style={{ fontSize: 12, lineHeight: 1, background: "rgba(0,0,0,0.7)" }}
          title="Remove"
        >
          ×
        </button>
      </div>
    );
  }

  // ── Open panel: drop zone + URL input ──
  if (open) {
    return (
      <div
        className="mt-2 flex flex-col gap-1.5"
        onClick={stopAll}
        onMouseDown={stopAll}
      >
        {/* Drag-and-drop / click-to-upload zone */}
        <div
          onDrop={(e) => { stopAll(e); const f = (e as React.DragEvent).dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => { stopAll(e); setIsDragging(true); }}
          onDragLeave={(e) => { stopAll(e); setIsDragging(false); }}
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all select-none"
          style={{
            height: 54,
            border: `1.5px dashed ${isDragging ? "rgba(224,182,79,0.9)" : "rgba(255,255,255,0.2)"}`,
            background: isDragging ? "rgba(224,182,79,0.07)" : "rgba(255,255,255,0.03)",
          }}
        >
          {uploading ? (
            <div className="w-4 h-4 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          ) : isDragging ? (
            <span className="font-display text-[9px] text-gold tracking-wide">drop to upload</span>
          ) : (
            <>
              <span style={{ fontSize: 16, lineHeight: 1 }}>📁</span>
              <span className="font-display text-[8px] text-ink-faint tracking-wide">drag here or click to browse</span>
            </>
          )}
        </div>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />

        {/* URL fallback */}
        <div className="flex items-center gap-1">
          <span className="font-display text-[7px] text-ink-faint flex-shrink-0 opacity-50">or URL</span>
          <input
            ref={urlInputRef}
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") confirmUrl();
              if (e.key === "Escape") { setOpen(false); setUrlDraft(""); }
            }}
            placeholder="YouTube / image link…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-faint"
            style={{ fontSize: 9, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 1 }}
          />
          <button onClick={confirmUrl} className="font-display text-[9px] text-gold flex-shrink-0 px-1">✓</button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); setUrlDraft(""); setIsDragging(false); }}
            className="font-display text-[9px] text-ink-faint flex-shrink-0 px-1"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── Collapsed: "📎 add media" button — also accepts direct drops ──
  return (
    <div
      onDrop={(e) => { stopAll(e); const f = (e as React.DragEvent).dataTransfer.files[0]; if (f) handleFile(f); }}
      onDragOver={(e) => { stopAll(e); setIsDragging(true); }}
      onDragLeave={(e) => { stopAll(e); setIsDragging(false); }}
      onMouseDown={stopAll}
      className="mt-1 transition-all"
      style={{
        borderRadius: 6,
        border: isDragging ? "1.5px dashed rgba(224,182,79,0.8)" : "1.5px dashed transparent",
        background: isDragging ? "rgba(224,182,79,0.06)" : "transparent",
        padding: isDragging ? "3px 6px" : "0",
      }}
    >
      {uploading ? (
        <div className="flex items-center gap-1.5 py-0.5">
          <div className="w-3 h-3 rounded-full border border-gold border-t-transparent animate-spin" />
          <span className="font-display text-[8px] text-gold">uploading…</span>
        </div>
      ) : isDragging ? (
        <span className="font-display text-[8px] text-gold tracking-wide">drop to upload</span>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="flex items-center gap-1 font-display text-[8px] tracking-wide text-ink-faint opacity-40 hover:opacity-80 transition-opacity"
        >
          📎 <span>add media</span>
        </button>
      )}
    </div>
  );
}
