"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { VideoTrimModal } from "@/components/ui/video-trim-modal";
import { useUploadManagerSafe } from "@/lib/upload-manager";

export interface SubStep {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
  videoUrl?: string;
}

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
  // Sub-steps
  substeps?: SubStep[];
  // Student context for library browser + clip uploads
  studentId?: string;
  studentSlug?: string;
  studentName?: string;
  // Count of "I felt it" threads the student has submitted for this step
  feltItCount?: number;
  // Callbacks
  onLabelChange?: (label: string) => void;
  onUrlChange?: (url: string) => void;
  onCaptionChange?: (caption: string) => void;
  onMediaUpload?: (file: File) => Promise<string>;
  onWhyChange?: (v: string) => void;
  onWhyVisibleChange?: (v: boolean) => void;
  onDoneChange?: (done: boolean) => void;
  onAddStep?: () => void;
  onSubstepsChange?: (substeps: SubStep[]) => void;
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

type MediaTab = "library" | "upload" | "paste";

interface StudentVideo {
  id: string;
  video_url: string;
  label: string;
  day_number: number | null;
  kind: string;
}

function cfStreamUid(url: string): string | null {
  const m = url.match(/videodelivery\.net\/([a-f0-9]{32,})/);
  return m ? m[1] : null;
}

function isCfStreamUrl(url: string): boolean {
  return /videodelivery\.net\/[a-f0-9]{32,}/.test(url);
}

function LibraryGrid({
  studentId,
  onSelect,
  onClip,
  fetchingId,
}: {
  studentId: string;
  onSelect: (url: string) => void;
  onClip?: (video: StudentVideo) => void;
  fetchingId?: string | null;
}) {
  const [videos, setVideos] = useState<StudentVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coach/students/${studentId}/videos`)
      .then((r) => r.json())
      .then((data: StudentVideo[]) => setVideos(Array.isArray(data) ? data : []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-4 h-4 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <p className="font-display text-[8px] text-ink-faint text-center py-3 tracking-wide">
        No videos yet — upload a session video to a debrief first.
      </p>
    );
  }

  return (
    <div
      className="grid gap-1.5 overflow-y-auto"
      style={{ gridTemplateColumns: "repeat(2, 1fr)", maxHeight: 180 }}
    >
      {videos.map((v) => {
        const uid = cfStreamUid(v.video_url);
        const isCf = isCfStreamUrl(v.video_url);
        const isFetching = fetchingId === v.id;

        return (
          <div
            key={v.id}
            className="relative rounded-lg overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {/* Thumbnail / click to select */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(v.video_url); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full text-left transition-opacity hover:opacity-80"
            >
              {uid ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=1s&height=80`}
                  alt={v.label}
                  className="w-full h-12 object-cover block"
                />
              ) : (
                <div className="w-full h-12 flex items-center justify-center text-lg">🎬</div>
              )}
              <div className="px-1.5 py-1">
                <p className="font-display text-[7px] tracking-wide text-ink leading-tight truncate">
                  {v.label || "Video"}
                </p>
                {v.day_number != null && (
                  <p className="font-display text-[6px] tracking-widest text-gold opacity-70">
                    DAY {v.day_number}
                  </p>
                )}
              </div>
            </button>

            {/* Clip button — only shown when onClip is provided */}
            {onClip && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClip(v); }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isFetching}
                title={isCf ? "CF Stream video — attach as-is (original file needed to trim)" : "Fetch & trim this clip"}
                className="absolute bottom-1 right-1 rounded px-1 py-0.5 font-display text-[7px] tracking-widest transition-opacity"
                style={{
                  background: isCf ? "rgba(255,255,255,0.08)" : "rgba(224,182,79,0.2)",
                  color: isCf ? "var(--ink-faint)" : "var(--gold)",
                  border: `1px solid ${isCf ? "rgba(255,255,255,0.1)" : "rgba(224,182,79,0.3)"}`,
                  opacity: isFetching ? 0.5 : 1,
                }}
              >
                {isFetching ? "…" : isCf ? "Use" : "✂"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MediaAttach({
  url,
  onUrlChange,
  onUpload,
  studentId,
  studentSlug,
  studentName,
}: {
  url?: string;
  onUrlChange?: (url: string) => void;
  onUpload?: (file: File) => Promise<string>;
  studentId?: string;
  studentSlug?: string;
  studentName?: string;
}) {
  const uploadManager = useUploadManagerSafe();
  const canUseManager = !!(uploadManager && studentId && studentSlug && studentName);

  const [open, setOpen] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTab>(studentId ? "library" : "upload");
  const [urlDraft, setUrlDraft] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [trimmingFile, setTrimmingFile] = useState<File | null>(null);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [fetchingLibraryId, setFetchingLibraryId] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive upload progress from the global queue when clip is in-flight
  const clipProgress = activeClipId
    ? (uploadManager?.items.find((i) => i.id === activeClipId)?.progress ?? 0)
    : 0;
  const clipStatus = activeClipId
    ? (uploadManager?.items.find((i) => i.id === activeClipId)?.status ?? "uploading")
    : null;

  useEffect(() => {
    if (open) urlInputRef.current?.focus();
  }, [open]);

  async function handleFile(file: File) {
    setUploadError(null);
    // Video files go through the trim modal first
    if (isVideoFile(file)) {
      setIsDragging(false);
      setTrimmingFile(file);
      return;
    }
    // Non-video (images/GIFs): upload immediately
    if (canUseManager) {
      setOpen(false);
      const id = uploadManager!.enqueue({
        file,
        studentSlug: studentSlug!,
        studentName: studentName!,
        kind: "node",
        persistVideo: studentId ? { studentId, label: "Node clip", videoKind: "node" } : undefined,
        onComplete(resultUrl) {
          onUrlChange?.(resultUrl);
          setActiveClipId(null);
        },
        onError() { setActiveClipId(null); },
      });
      setActiveClipId(id);
    } else if (onUpload) {
      setUploading(true);
      setIsDragging(false);
      try {
        const uploaded = await onUpload(file);
        onUrlChange?.(uploaded);
        setOpen(false);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed — try again");
      } finally {
        setUploading(false);
      }
    }
  }

  async function handleTrimmedFile(file: File) {
    setTrimmingFile(null);
    setUploadError(null);
    if (canUseManager) {
      setOpen(false);
      const id = uploadManager!.enqueue({
        file,
        studentSlug: studentSlug!,
        studentName: studentName!,
        kind: "node",
        persistVideo: studentId ? { studentId, label: "Node clip", videoKind: "node" } : undefined,
        onComplete(resultUrl) {
          onUrlChange?.(resultUrl);
          setActiveClipId(null);
        },
        onError() { setActiveClipId(null); },
      });
      setActiveClipId(id);
    } else if (onUpload) {
      setUploading(true);
      setOpen(false);
      try {
        const uploaded = await onUpload(file);
        onUrlChange?.(uploaded);
      } catch (err) {
        setOpen(true);
        setUploadError(err instanceof Error ? err.message : "Upload failed — try again");
      } finally {
        setUploading(false);
      }
    }
  }

  async function handleLibraryClip(video: StudentVideo) {
    const isCf = isCfStreamUrl(video.video_url);
    if (isCf) {
      // CF Stream: can't fetch in-browser — attach as-is
      onUrlChange?.(video.video_url);
      closePanel();
      return;
    }
    // Supabase Storage: fetch blob then trim
    setFetchingLibraryId(video.id);
    setUploadError(null);
    try {
      const res = await fetch(video.video_url);
      if (!res.ok) throw new Error(`Could not load video (${res.status})`);
      const blob = await res.blob();
      const fileName = (video.label || "session").replace(/[^a-zA-Z0-9]/g, "_") + ".mp4";
      const file = new File([blob], fileName, { type: "video/mp4" });
      setFetchingLibraryId(null);
      setTrimmingFile(file);
    } catch (err) {
      setFetchingLibraryId(null);
      setUploadError(err instanceof Error ? err.message : "Could not load video for trimming");
    }
  }

  function stopAll(e: React.SyntheticEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  function closePanel() {
    setOpen(false);
    setUrlDraft("");
    setIsDragging(false);
    setUploadError(null);
  }

  function confirmUrl() {
    const trimmed = urlDraft.trim();
    if (trimmed) { onUrlChange?.(trimmed); closePanel(); }
  }

  // Portal for trim modal — escapes React Flow's transform context so position:fixed works
  const trimPortal = trimmingFile && typeof document !== "undefined"
    ? createPortal(
        <VideoTrimModal
          file={trimmingFile}
          onConfirm={handleTrimmedFile}
          onCancel={() => { setTrimmingFile(null); setUploadError(null); }}
          onSkipTrim={handleTrimmedFile}
        />,
        document.body
      )
    : null;

  // ── Has URL: thumbnail / video / remove ──
  if (url) {
    const thumb = getYtThumb(url) ?? (isImgOrGif(url) ? url : null);
    return (
      <>
        {trimPortal}
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
      </>
    );
  }

  // ── Open panel: tabs (Library | Upload | Paste) ──
  if (open) {
    const tabs: { key: MediaTab; label: string }[] = studentId
      ? [{ key: "library", label: "Library" }, { key: "upload", label: "Upload" }, { key: "paste", label: "Paste" }]
      : [{ key: "upload", label: "Upload" }, { key: "paste", label: "Paste" }];

    return (
      <>
        {trimPortal}
        <div
          className="mt-2 flex flex-col gap-1.5"
          onClick={stopAll}
          onMouseDown={stopAll}
        >
          {/* Tab bar */}
          <div className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={(e) => { e.stopPropagation(); setMediaTab(t.key); }}
                className="font-display text-[8px] tracking-widest px-2 py-0.5 rounded transition-all"
                style={
                  mediaTab === t.key
                    ? { background: "rgba(224,182,79,0.15)", color: "var(--gold)", border: "1px solid rgba(224,182,79,0.3)" }
                    : { background: "transparent", color: "var(--ink-faint)", border: "1px solid transparent", opacity: 0.6 }
                }
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); closePanel(); }}
              className="ml-auto font-display text-[9px] text-ink-faint px-1 opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>

          {/* Library tab */}
          {mediaTab === "library" && studentId && (
            <>
              {/* Clip upload in progress */}
              {activeClipId && clipStatus === "uploading" && (
                <div className="flex flex-col gap-1 py-1">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[8px] tracking-widest text-gold animate-pulse">
                      Uploading clip… {clipProgress}%
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); uploadManager?.cancel(activeClipId); setActiveClipId(null); }}
                      className="font-display text-[7px] tracking-widest text-coral"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${clipProgress}%`, background: "var(--gold)" }}
                    />
                  </div>
                </div>
              )}
              <LibraryGrid
                studentId={studentId}
                onSelect={(selectedUrl) => { onUrlChange?.(selectedUrl); closePanel(); }}
                onClip={handleLibraryClip}
                fetchingId={fetchingLibraryId}
              />
            </>
          )}

          {/* Upload tab */}
          {mediaTab === "upload" && (
            <>
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,image/gif"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
            </>
          )}

          {/* Paste tab */}
          {mediaTab === "paste" && (
            <div className="flex items-center gap-1">
              <input
                ref={urlInputRef}
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") confirmUrl();
                  if (e.key === "Escape") closePanel();
                }}
                placeholder="YouTube / image / video link…"
                className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-faint"
                style={{ fontSize: 9, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 1 }}
                autoFocus
              />
              <button onClick={confirmUrl} className="font-display text-[9px] text-gold flex-shrink-0 px-1">✓</button>
            </div>
          )}

          {/* Error message */}
          {uploadError && (
            <p className="font-display text-[8px] tracking-wide" style={{ color: "var(--coral, #ff6b6b)" }}>
              ✕ {uploadError}
            </p>
          )}
        </div>
      </>
    );
  }

  // ── Collapsed: "📎 add media" button — also accepts direct drops ──
  return (
    <>
      {trimPortal}
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
        {(uploading || (activeClipId && clipStatus === "uploading")) ? (
          <div className="flex items-center gap-1.5 py-0.5">
            <div className="w-3 h-3 rounded-full border border-gold border-t-transparent animate-spin" />
            <span className="font-display text-[8px] text-gold">
              {activeClipId ? `uploading clip… ${clipProgress}%` : "uploading…"}
            </span>
          </div>
        ) : isDragging ? (
          <span className="font-display text-[8px] text-gold tracking-wide">drop to upload</span>
        ) : uploadError ? (
          <div className="flex items-center gap-1 py-0.5">
            <span className="font-display text-[8px]" style={{ color: "var(--coral, #ff6b6b)" }}>✕ {uploadError}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setUploadError(null); setOpen(true); }}
              className="font-display text-[8px] text-gold underline ml-1"
            >
              retry
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(true); }}
            className="flex items-center gap-1 font-display text-[8px] tracking-wide text-ink-faint opacity-40 hover:opacity-80 transition-opacity"
          >
            📎 <span>add media</span>
          </button>
        )}
      </div>
    </>
  );
}
