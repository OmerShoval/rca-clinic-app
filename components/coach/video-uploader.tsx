"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import { VideoTrimModal } from "@/components/ui/video-trim-modal";
import { useUploadManager } from "@/lib/upload-manager";
import { VideoThumb } from "@/components/ui/video-thumb";
import { VideoSlot } from "@/components/ui/video-slot";
import { VideoLibraryPicker } from "@/components/coach/video-library-picker";
import type { VideoSourceType } from "@/lib/database.types";

interface Props {
  label: string;
  studentSlug: string;
  studentName: string;
  value: string;
  accentColor?: string;
  accentBg?: string;
  accentBorder?: string;
  onChange: (url: string) => void;
  /** When provided, the upload manager auto-saves to student_videos on success. */
  studentId?: string;
  debriefId?: string | null;
  debriefLabel?: string;
  debriefDayNum?: number | null;
  /** Source tagging for the video library row. */
  sourceType?: VideoSourceType;
  sourceId?: string;
  tags?: string[];
}

type Tab = "upload" | "paste" | "library";
type UploadState = "idle" | "trimming" | "preview" | "uploading" | "done";

/** Match `https://iframe.videodelivery.net/<uid>` */
function isCFStreamUrl(url: string): boolean {
  return /videodelivery\.net\/[a-f0-9]{32,}/.test(url);
}

/** Extract the 32-char UID from a CF Stream iframe URL */
function cfStreamUid(url: string): string | null {
  const m = url.match(/videodelivery\.net\/([a-f0-9]{32,})/);
  return m ? m[1] : null;
}

/** True for files stored directly (Supabase or other CDN) */
function isDirectFile(url: string): boolean {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(mp4|webm|mov|avi|gif)(\?|$)/.test(pathname);
  } catch {
    return /\.(mp4|webm|mov|avi|gif)(\?|$)/.test(url.toLowerCase());
  }
}

/** True for any "uploaded" file — either CF Stream or a direct Supabase file */
function isHostedFile(url: string): boolean {
  return isDirectFile(url) || isCFStreamUrl(url);
}

export function VideoUploader({
  label,
  studentSlug,
  studentName,
  value,
  accentColor = "var(--teal)",
  accentBg = "var(--teal-soft)",
  accentBorder = "rgba(47,214,192,0.3)",
  onChange,
  studentId,
  debriefId,
  debriefLabel,
  debriefDayNum,
  sourceType,
  sourceId,
  tags,
}: Props) {
  const uploadManager = useUploadManager();

  const [tab, setTab] = useState<Tab>(value && !isHostedFile(value) ? "paste" : "upload");
  const [uploadState, setUploadState] = useState<UploadState>(value && isHostedFile(value) ? "done" : "idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [trimmingFile, setTrimmingFile] = useState<File | null>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState(value && !isHostedFile(value) ? value : "");
  const [playingDone, setPlayingDone] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Derive progress from the global upload queue
  const uploadProgress =
    currentUploadId
      ? (uploadManager.items.find((i) => i.id === currentUploadId)?.progress ?? 0)
      : 0;

  useEffect(() => {
    setPlayingDone(false);
    if (value && isHostedFile(value)) {
      setUploadState("done");
      setTab("upload");
    } else if (value && !isHostedFile(value)) {
      setPasteValue(value);
      setTab("paste");
      setUploadState("idle");
    } else {
      setUploadState("idle");
    }
  }, [value]);

  function cleanup() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setCurrentUploadId(null);
    setUploadState("idle");
    setError(null);
  }

  function onTrimConfirm(trimmedFile: File) {
    const url = URL.createObjectURL(trimmedFile);
    setPreviewUrl(url);
    setPreviewFile(trimmedFile);
    setTrimmingFile(null);
    setUploadState("preview");
  }

  function onTrimCancel() {
    // The original file is still in preview — go back to it rather than
    // discarding the coach's drop entirely.
    setTrimmingFile(null);
    setUploadState(previewFile ? "preview" : "idle");
  }

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setError(null);
    // Every file goes straight to preview. Trimming is opt-in via the Trim
    // button below — it used to be mandatory for every non-GIF clip, which put
    // a 32 MB WASM download and a full single-threaded libx264 re-encode on the
    // critical path of every single upload.
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewFile(file);
    setUploadState("preview");
  }, []);

  /** Opt into the FFmpeg trim modal for the file currently in preview. */
  function startTrim() {
    if (!previewFile) return;
    setTrimmingFile(previewFile);
    setUploadState("trimming");
  }

  function startUpload() {
    if (!previewFile || !previewUrl) return;
    setUploadState("uploading");
    setError(null);

    const capturedPreviewUrl = previewUrl;
    const id = uploadManager.enqueue({
      file: previewFile,
      studentSlug,
      studentName,
      kind: "video",
      persistVideo: studentId
        ? { studentId, debriefId, label: debriefLabel, dayNum: debriefDayNum, videoKind: "session", sourceType, sourceId, tags }
        : undefined,
      onComplete(url) {
        URL.revokeObjectURL(capturedPreviewUrl);
        setPreviewUrl(null);
        setPreviewFile(null);
        setCurrentUploadId(null);
        setUploadState("done");
        onChange(url);
      },
      onError(msg) {
        setError(msg);
        setUploadState("preview");
        setCurrentUploadId(null);
      },
    });
    setCurrentUploadId(id);
  }

  function cancelUpload() {
    if (currentUploadId) {
      uploadManager.cancel(currentUploadId);
      setCurrentUploadId(null);
    }
    setUploadState("preview");
  }

  function handleReplace() {
    if (value) {
      fetch("/api/coach/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      }).catch(() => {});
    }
    onChange("");
    cleanup();
    setPasteValue("");
  }

  function handlePasteChange(v: string) {
    setPasteValue(v);
    onChange(v);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
      "video/quicktime": [".mov"],
      "image/gif": [".gif"],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
    disabled: uploadState === "trimming" || uploadState === "uploading",
    onDropRejected: (rj) => {
      setError(rj[0]?.errors[0]?.message ?? "File rejected");
    },
  });

  // Derive the CF Stream UID (if the saved value is a CF URL)
  const cfUid = value ? cfStreamUid(value) : null;

  return (
    <>
      {uploadState === "trimming" && trimmingFile && typeof document !== "undefined" &&
        createPortal(
          <VideoTrimModal
            file={trimmingFile}
            onConfirm={onTrimConfirm}
            onCancel={onTrimCancel}
            onSkipTrim={onTrimConfirm}
          />,
          document.body
        )
      }

      {/* Library picker — renders its own portal/modal */}
      {libraryOpen && studentId && (
        <VideoLibraryPicker
          studentId={studentId}
          onPick={(v) => { onChange(v.video_url); setLibraryOpen(false); setTab("library"); }}
          onClose={() => setLibraryOpen(false)}
        />
      )}

      <div className="flex flex-col gap-2">
        <p className="font-display text-[9px] tracking-[0.2em] text-ink-faint">{label}</p>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--glass-edge)" }}>
          {(() => {
            const tabDefs: { key: Tab; label: string }[] = [
              { key: "upload", label: "Upload File" },
              ...(studentId ? [{ key: "library" as Tab, label: "Library" }] : []),
              { key: "paste", label: "Paste Link" },
            ];
            return tabDefs.map((t, i) => {
              const isLast = i === tabDefs.length - 1;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className="flex-1 py-3 font-display text-[9px] tracking-widest transition-colors"
                  style={tab === t.key
                    ? { background: accentBg, color: accentColor, borderRight: isLast ? undefined : `1px solid ${accentBorder}` }
                    : { background: "transparent", color: "var(--ink-faint)", borderRight: isLast ? undefined : "1px solid var(--glass-edge)" }
                  }
                >
                  {t.label}
                </button>
              );
            });
          })()}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Upload tab ── */}
          {tab === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>

              {/* ── Done: CF Stream video ── */}
              {uploadState === "done" && cfUid && (
                <div className="flex flex-col gap-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${accentBorder}` }}>
                  {playingDone ? (
                    // Real, playable player once tapped
                    <VideoSlot url={value} label={label} />
                  ) : (
                    // Tap the poster to expand into the player
                    <button
                      type="button"
                      onClick={() => setPlayingDone(true)}
                      className="block w-full text-left transition-opacity hover:opacity-90"
                      aria-label="Play video"
                    >
                      <VideoThumb url={value} label={label} />
                    </button>
                  )}
                  <div className="flex items-center justify-between px-3 pb-2">
                    <p className="font-display text-[8px] tracking-widest" style={{ color: accentColor }}>
                      Cloudflare Stream ✓
                    </p>
                    <button type="button" onClick={handleReplace} className="font-display text-[9px] tracking-widest text-coral">
                      Replace
                    </button>
                  </div>
                </div>
              )}

              {/* ── Done: direct file (GIF / legacy Supabase MP4) ── */}
              {uploadState === "done" && value && isDirectFile(value) && (
                <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "var(--glass)", border: `1px solid ${accentBorder}` }}>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={value} controls preload="metadata" className="w-full rounded-lg object-cover" style={{ maxHeight: 200 }} />
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[8px] tracking-widest text-ink-faint">Video saved ✓</p>
                    <button type="button" onClick={handleReplace} className="font-display text-[9px] tracking-widest text-coral">
                      Replace
                    </button>
                  </div>
                </div>
              )}

              {/* ── Idle — drop zone ── */}
              {uploadState === "idle" && (
                <div
                  {...getRootProps()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl p-5 cursor-pointer transition-colors select-none"
                  style={{
                    border: `1px dashed ${isDragActive ? accentColor : "var(--glass-edge)"}`,
                    background: isDragActive ? accentBg : "var(--depth)",
                  }}
                >
                  <input {...getInputProps()} />
                  <span className="text-2xl">{isDragActive ? "📥" : "🎬"}</span>
                  <p className="font-display text-[10px] tracking-widest text-ink-faint text-center leading-relaxed">
                    {isDragActive ? "Drop it!" : "Drop clip here\nor click to browse"}
                  </p>
                  <p className="font-display text-[8px] tracking-widest text-ink-faint opacity-60">
                    MP4 · MOV · WebM → Cloudflare Stream &nbsp;·&nbsp; GIF → Supabase
                  </p>
                </div>
              )}

              {/* ── Preview — confirm before uploading ── */}
              {uploadState === "preview" && previewUrl && previewFile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-2 rounded-xl p-3"
                  style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
                >
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={previewUrl} controls preload="metadata" className="w-full rounded-lg object-cover" style={{ maxHeight: 200 }} />
                  <p className="font-display text-[8px] tracking-widest text-ink-faint">
                    {previewFile.type === "image/gif" ? "GIF" : "MP4"} ready · {(previewFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startUpload}
                      className="flex-1 rounded-lg py-2 font-display text-[11px] tracking-widest transition-opacity"
                      style={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}
                    >
                      Upload Video
                    </button>
                    {previewFile.type !== "image/gif" && (
                      <button
                        type="button"
                        onClick={startTrim}
                        className="rounded-lg px-3 py-2 font-display text-[11px] tracking-widest text-ink-faint"
                        style={{ border: "1px solid var(--glass-edge)" }}
                      >
                        Trim
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={cleanup}
                      className="rounded-lg px-3 py-2 font-display text-[11px] tracking-widest text-ink-faint"
                      style={{ border: "1px solid var(--glass-edge)" }}
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Uploading ── */}
              {uploadState === "uploading" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-3 rounded-xl p-4"
                  style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[10px] tracking-widest text-ink-faint">
                      {previewFile?.type === "image/gif" ? "Uploading to Supabase…" : "Uploading to Cloudflare Stream…"}
                    </p>
                    <p className="font-display text-[10px] tracking-widest" style={{ color: accentColor }}>{uploadProgress}%</p>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--depth)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: accentColor }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ ease: "linear", duration: 0.2 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="font-display text-[9px] tracking-widest text-coral self-end"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Library tab ── */}
          {tab === "library" && studentId && (
            <motion.div key="library" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
              {uploadState === "done" && value ? (
                <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "var(--glass)", border: `1px solid ${accentBorder}` }}>
                  <VideoThumb url={value} label={label} />
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[8px] tracking-widest" style={{ color: accentColor }}>From library ✓</p>
                    <button type="button" onClick={handleReplace} className="font-display text-[9px] tracking-widest text-coral">
                      Replace
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 w-full rounded-xl p-5 cursor-pointer transition-colors select-none"
                  style={{ border: `1px dashed var(--glass-edge)`, background: "var(--depth)" }}
                >
                  <span className="text-2xl">🎞️</span>
                  <p className="font-display text-[10px] tracking-widest text-ink-faint text-center">
                    Choose an existing clip
                  </p>
                </button>
              )}
            </motion.div>
          )}

          {/* ── Paste tab ── */}
          {tab === "paste" && (
            <motion.div key="paste" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
              <input
                type="text"
                value={pasteValue}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder="YouTube · Vimeo · Drive · any URL…"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors"
                style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = accentColor)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-edge)")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="font-display text-[9px] tracking-wide text-coral">{error}</p>
        )}
      </div>
    </>
  );
}
