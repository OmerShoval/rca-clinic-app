"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

interface Props {
  label: string;
  studentSlug: string;
  value: string;
  accentColor?: string;
  accentBg?: string;
  accentBorder?: string;
  onChange: (url: string) => void;
}

type Tab = "upload" | "paste";
type UploadState = "idle" | "converting" | "preview" | "uploading" | "done";
type ConvertPhase = "loading_engine" | "converting";

// FFmpeg WASM URLs — loaded from CDN, cached by browser after first load
const FFMPEG_CORE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js";
const FFMPEG_WASM_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm";

export function VideoUploader({
  label,
  studentSlug,
  value,
  accentColor = "var(--teal)",
  accentBg = "var(--teal-soft)",
  accentBorder = "rgba(47,214,192,0.3)",
  onChange,
}: Props) {
  const [tab, setTab] = useState<Tab>(value && !isDirectFile(value) ? "paste" : "upload");
  const [uploadState, setUploadState] = useState<UploadState>(value && isDirectFile(value) ? "done" : "idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [convertProgress, setConvertProgress] = useState(0);
  const [convertPhase, setConvertPhase] = useState<ConvertPhase>("loading_engine");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState(value && !isDirectFile(value) ? value : "");

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const cancelConvertRef = useRef(false);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (value && isDirectFile(value)) {
      setUploadState("done");
      setTab("upload");
    } else if (value && !isDirectFile(value)) {
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
    setUploadState("idle");
    setConvertProgress(0);
    setUploadProgress(0);
    setError(null);
  }

  async function loadFFmpeg(): Promise<FFmpeg> {
    if (ffmpegRef.current) return ffmpegRef.current;

    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ff = new FFmpeg();
    ff.on("progress", ({ progress }) => {
      setConvertPhase("converting");
      setConvertProgress(Math.min(99, Math.round(progress * 100)));
    });

    await ff.load({
      coreURL: await toBlobURL(FFMPEG_CORE_URL, "text/javascript"),
      wasmURL: await toBlobURL(FFMPEG_WASM_URL, "application/wasm"),
    });

    ffmpegRef.current = ff;
    return ff;
  }

  async function convertToGif(file: File): Promise<{ blob: Blob; url: string; sizeMB: number } | null> {
    cancelConvertRef.current = false;
    setConvertProgress(0);
    setConvertPhase("loading_engine");

    try {
      const ff = await loadFFmpeg();
      if (cancelConvertRef.current) return null;

      const { fetchFile } = await import("@ffmpeg/util");
      setConvertPhase("converting");

      await ff.writeFile("input", await fetchFile(file));
      if (cancelConvertRef.current) return null;

      // High-quality GIF: 10fps, 640px wide, first 15s, optimal palette + bayer dithering
      await ff.exec([
        "-i", "input",
        "-t", "15",
        "-vf", "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5",
        "output.gif",
      ]);

      if (cancelConvertRef.current) return null;

      const raw = await ff.readFile("output.gif") as Uint8Array;
      const blob = new Blob([new Uint8Array(raw)], { type: "image/gif" });
      const url = URL.createObjectURL(blob);

      await ff.deleteFile("input").catch(() => {});
      await ff.deleteFile("output.gif").catch(() => {});

      return { blob, url, sizeMB: Math.round(blob.size / 1024 / 1024 * 10) / 10 };
    } catch (err) {
      if (cancelConvertRef.current) return null;
      // If FFmpeg instance is broken, clear it so next attempt re-loads
      ffmpegRef.current = null;
      throw err;
    }
  }

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setError(null);

    // Already a GIF — no conversion needed
    if (file.type === "image/gif") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewFile(file);
      setUploadState("preview");
      return;
    }

    // Auto-convert video → GIF
    setUploadState("converting");
    try {
      const result = await convertToGif(file);
      if (!result) {
        setUploadState("idle");
        return;
      }
      setPreviewUrl(result.url);
      setPreviewFile(new File([result.blob], "clip.gif", { type: "image/gif" }));
      setUploadState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed — try a smaller clip");
      setUploadState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentSlug]);

  function cancelConvert() {
    cancelConvertRef.current = true;
    if (ffmpegRef.current) {
      ffmpegRef.current.terminate();
      ffmpegRef.current = null;
    }
    setUploadState("idle");
    setConvertProgress(0);
    setError(null);
  }

  function startUpload() {
    if (!previewFile || !previewUrl) return;
    setUploadState("uploading");
    setUploadProgress(0);
    setError(null);

    const fd = new FormData();
    fd.append("file", previewFile, previewFile.name);
    fd.append("studentSlug", studentSlug);
    fd.append("kind", "video");

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      uploadXhrRef.current = null;
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 400 || json.error) {
          setError(json.error ?? "Upload failed");
          setUploadState("preview");
          return;
        }
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewFile(null);
        setUploadState("done");
        onChange(json.url);
      } catch {
        setError("Unexpected server response");
        setUploadState("preview");
      }
    });

    xhr.addEventListener("error", () => {
      uploadXhrRef.current = null;
      setError("Network error — check your connection");
      setUploadState("preview");
    });

    xhr.open("POST", "/api/coach/upload");
    xhr.send(fd);
  }

  function cancelUpload() {
    uploadXhrRef.current?.abort();
    uploadXhrRef.current = null;
    setUploadState("preview");
    setUploadProgress(0);
  }

  function handleReplace() {
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
    maxSize: 500 * 1024 * 1024, // 500 MB input (will be compressed to GIF)
    disabled: uploadState === "converting" || uploadState === "uploading",
    onDropRejected: (rj) => {
      setError(rj[0]?.errors[0]?.message ?? "File rejected");
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-[9px] tracking-[0.2em] text-ink-faint">{label}</p>

      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--glass-edge)" }}>
        {(["upload", "paste"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 font-display text-[9px] tracking-widest transition-colors"
            style={tab === t
              ? { background: accentBg, color: accentColor, borderRight: t === "upload" ? `1px solid ${accentBorder}` : undefined }
              : { background: "transparent", color: "var(--ink-faint)", borderRight: t === "upload" ? "1px solid var(--glass-edge)" : undefined }
            }
          >
            {t === "upload" ? "Upload File" : "Paste Link"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Upload tab ── */}
        {tab === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>

            {/* Saved GIF */}
            {uploadState === "done" && value && isDirectFile(value) && (
              <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "var(--glass)", border: `1px solid ${accentBorder}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="clip" className="w-full rounded-lg object-cover max-h-48" />
                <div className="flex items-center justify-between">
                  <p className="font-display text-[8px] tracking-widest text-ink-faint">GIF saved ✓</p>
                  <button type="button" onClick={handleReplace} className="font-display text-[9px] tracking-widest text-coral">
                    Replace
                  </button>
                </div>
              </div>
            )}

            {/* Idle — drop zone */}
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
                  MP4 · MOV · WebM · GIF — auto-converts to GIF
                </p>
              </div>
            )}

            {/* Converting */}
            {uploadState === "converting" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-3 rounded-xl p-4"
                style={{ background: "var(--glass)", border: `1px solid ${accentBorder}` }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 rounded-full border-2 border-t-transparent flex-shrink-0"
                    style={{ borderColor: `${accentColor} transparent transparent transparent` }}
                  />
                  <p className="font-display text-[10px] tracking-widest flex-1" style={{ color: accentColor }}>
                    {convertPhase === "loading_engine" ? "Loading converter…" : "Converting to GIF…"}
                  </p>
                  <p className="font-display text-[10px] tracking-widest text-ink-faint">
                    {convertPhase === "loading_engine" ? "once" : `${convertProgress}%`}
                  </p>
                </div>

                {convertPhase === "converting" && (
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--depth)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: accentColor }}
                      animate={{ width: `${convertProgress}%` }}
                      transition={{ ease: "linear", duration: 0.3 }}
                    />
                  </div>
                )}

                {convertPhase === "loading_engine" && (
                  <p className="font-display text-[8px] tracking-widest text-ink-faint opacity-70">
                    First-time only — cached after this
                  </p>
                )}

                <button
                  type="button"
                  onClick={cancelConvert}
                  className="font-display text-[9px] tracking-widest text-coral self-end"
                >
                  Cancel
                </button>
              </motion.div>
            )}

            {/* Preview GIF — confirm before uploading */}
            {uploadState === "preview" && previewUrl && previewFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-2 rounded-xl p-3"
                style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="preview" className="w-full rounded-lg object-cover max-h-48" />
                <p className="font-display text-[8px] tracking-widest text-ink-faint">
                  GIF ready · {(previewFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startUpload}
                    className="flex-1 rounded-lg py-2 font-display text-[11px] tracking-widest transition-opacity"
                    style={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}
                  >
                    Upload GIF
                  </button>
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

            {/* Uploading to Supabase */}
            {uploadState === "uploading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3 rounded-xl p-4"
                style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-[10px] tracking-widest text-ink-faint">Uploading GIF…</p>
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
  );
}

function isDirectFile(url: string): boolean {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(mp4|webm|mov|avi|gif)(\?|$)/.test(pathname);
  } catch {
    return /\.(mp4|webm|mov|avi|gif)(\?|$)/.test(url.toLowerCase());
  }
}
