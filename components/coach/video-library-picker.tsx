"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { VideoThumb } from "@/components/ui/video-thumb";
import type { LibraryVideo } from "@/lib/database.types";

interface Facets {
  providers: string[];
  source_types: string[];
  tags: string[];
  students: { id: string; full_name: string; slug: string }[];
}

interface VideoLibraryPickerProps {
  /** When given, only videos for this student are shown; otherwise all students. */
  studentId?: string;
  /** Called with the chosen video, then onClose() runs. */
  onPick: (video: LibraryVideo) => void;
  onClose: () => void;
}

const chipBase =
  "font-display text-[10px] tracking-widest px-3 py-2 rounded-lg transition-all whitespace-nowrap";

function selStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "var(--teal)", color: "var(--abyss)", border: "1px solid var(--teal)" }
    : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" };
}

/**
 * Reusable full-screen modal to reuse an existing library clip.
 * Self-contained: fetches its own data, portals to document.body, closes on
 * Escape / backdrop / ✕. Safe to mount anywhere (including inside a React Flow node).
 */
export function VideoLibraryPicker({ studentId, onPick, onClose }: VideoLibraryPickerProps) {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [provider, setProvider] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    fetch("/api/coach/videos?facets=1")
      .then((r) => r.json())
      .then((d) => setFacets(d))
      .catch(() => {});
  }, []);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (studentId) params.set("student", studentId);
    if (debouncedQ) params.set("q", debouncedQ);
    if (sourceType) params.set("source_type", sourceType);
    if (provider) params.set("provider", provider);
    try {
      const res = await fetch(`/api/coach/videos?${params.toString()}`);
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, debouncedQ, sourceType, provider]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  function pick(v: LibraryVideo) {
    onPick(v);
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      dir="ltr"
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={onClose}
    >
      <div
        className="relative m-auto w-full max-w-4xl max-h-[88dvh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--glass-edge)" }}>
          <div className="flex items-center gap-3 mb-3">
            <p className="font-display text-ink text-sm tracking-widest">🎬 Choose a clip</p>
            <span className="font-display text-[10px] tracking-widest text-ink-faint">
              {loading ? "…" : `${videos.length}`}
            </span>
            <button
              onClick={onClose}
              className="ml-auto font-display text-ink-faint hover:text-coral transition-colors text-lg leading-none px-2"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search labels…"
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg font-display text-[12px] tracking-wide outline-none"
              style={{ background: "var(--glass)", color: "var(--ink)", border: "1px solid var(--glass-edge)" }}
            />
            {facets && facets.source_types.length > 0 && (
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className={chipBase}
                style={{ background: "var(--glass)", color: "var(--ink)", border: "1px solid var(--glass-edge)" }}
              >
                <option value="">All sources</option>
                {facets.source_types.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {facets && facets.providers.length > 0 && (
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className={chipBase}
                style={{ background: "var(--glass)", color: "var(--ink)", border: "1px solid var(--glass-edge)" }}
              >
                <option value="">All providers</option>
                {facets.providers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            {(sourceType || provider) && (
              <button
                onClick={() => { setSourceType(""); setProvider(""); }}
                className={chipBase}
                style={selStyle(false)}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="w-8 h-8 rounded-full animate-spin"
                style={{ border: "2px solid var(--glass-edge)", borderTopColor: "var(--teal)" }}
              />
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl mb-2 opacity-70">🎬</p>
              <p className="font-display text-[11px] tracking-widest text-ink-faint">No clips found</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {videos.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => pick(v)}
                  className="text-left rounded-xl overflow-hidden transition-all hover:opacity-90"
                  style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
                >
                  <div className="relative">
                    <VideoThumb
                      url={v.video_url}
                      posterUrl={v.poster_url}
                      provider={v.provider}
                      streamUid={v.stream_uid}
                      label={v.label}
                      className="w-full"
                    />
                    {v.is_best && (
                      <span className="absolute top-1.5 right-1.5 text-[13px]" style={{ color: "var(--gold)" }}>★</span>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="font-display text-[11px] tracking-wide text-ink truncate">{v.label || "Untitled"}</p>
                    {v.student_name && (
                      <p className="font-display text-[9px] tracking-widest text-ink-faint truncate mt-0.5">
                        {v.student_name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
