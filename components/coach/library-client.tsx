"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VideoThumb } from "@/components/ui/video-thumb";
import { VideoSlot } from "@/components/ui/video-slot";
import type { LibraryVideo } from "@/lib/database.types";

interface Facets {
  providers: string[];
  source_types: string[];
  tags: string[];
  students: { id: string; full_name: string; slug: string }[];
}

const KINDS = ["session", "node", "reference"] as const;

const chipBase =
  "font-display text-[10px] tracking-widest px-3 py-2 rounded-lg transition-all whitespace-nowrap";

function selStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "var(--teal)", color: "var(--abyss)", border: "1px solid var(--teal)" }
    : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" };
}

const selectStyle: React.CSSProperties = {
  background: "var(--glass)",
  color: "var(--ink)",
  border: "1px solid var(--glass-edge)",
};

export function CoachLibraryClient() {
  const router = useRouter();

  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [student, setStudent] = useState("");
  const [kind, setKind] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [provider, setProvider] = useState("");
  const [tag, setTag] = useState("");
  const [bestOnly, setBestOnly] = useState(false);

  const [active, setActive] = useState<LibraryVideo | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Load facets once
  useEffect(() => {
    fetch("/api/coach/videos?facets=1")
      .then((r) => r.json())
      .then((d) => setFacets(d))
      .catch(() => {});
  }, []);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (student) params.set("student", student);
    if (kind) params.set("kind", kind);
    if (sourceType) params.set("source_type", sourceType);
    if (provider) params.set("provider", provider);
    if (tag) params.set("tag", tag);
    if (bestOnly) params.set("is_best", "true");
    try {
      const res = await fetch(`/api/coach/videos?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to load videos");
        setVideos([]);
      } else {
        setVideos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, student, kind, sourceType, provider, tag, bestOnly]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleUpdated = useCallback((updated: LibraryVideo) => {
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)));
    setActive((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setActive(null);
  }, []);

  const hasFilters = q || student || kind || sourceType || provider || tag || bestOnly;

  function clearFilters() {
    setQ("");
    setStudent("");
    setKind("");
    setSourceType("");
    setProvider("");
    setTag("");
    setBestOnly(false);
  }

  return (
    <div dir="ltr" className="min-h-dvh bg-abyss">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 900px 350px at 70% -5%, rgba(224,182,79,0.04), transparent 60%)" }}
      />

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-4 md:px-8 py-4"
        style={{ borderBottom: "1px solid var(--glass-edge)", background: "var(--depth)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/coach/dashboard")}
            className="px-3 py-2 rounded-xl font-display text-[10px] tracking-widest text-ink-faint hover:text-teal transition-colors"
            style={{ border: "1px solid var(--glass-edge)" }}
          >
            ← Back
          </button>
          <div>
            <p className="font-display text-gold text-[10px] tracking-[0.3em]">Ocean Athlete</p>
            <h1 className="font-display text-ink text-2xl leading-none">🎬 Video Library</h1>
          </div>
          <span className="ml-auto font-display text-[11px] tracking-widest text-ink-faint">
            {loading ? "…" : `${videos.length} clip${videos.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search labels…"
            className="flex-1 min-w-[180px] px-3 py-2 rounded-lg font-display text-[12px] tracking-wide outline-none"
            style={selectStyle}
          />

          <select value={student} onChange={(e) => setStudent(e.target.value)} className={chipBase} style={selectStyle}>
            <option value="">All students</option>
            {facets?.students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>

          <select value={kind} onChange={(e) => setKind(e.target.value)} className={chipBase} style={selectStyle}>
            <option value="">All kinds</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={chipBase} style={selectStyle}>
            <option value="">All sources</option>
            {facets?.source_types.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={chipBase} style={selectStyle}>
            <option value="">All providers</option>
            {facets?.providers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {facets && facets.tags.length > 0 && (
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={chipBase} style={selectStyle}>
              <option value="">All tags</option>
              {facets.tags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setBestOnly((b) => !b)}
            className={chipBase}
            style={selStyle(bestOnly)}
          >
            ★ Best only
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className={chipBase}
              style={{ background: "transparent", color: "var(--coral)", border: "1px solid rgba(255,107,94,0.3)" }}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="px-4 md:px-8 py-6">
        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 font-display text-[12px] tracking-wide text-coral"
            style={{ background: "var(--coral-soft)", border: "1px solid rgba(255,107,94,0.3)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="w-8 h-8 rounded-full animate-spin"
              style={{ border: "2px solid var(--glass-edge)", borderTopColor: "var(--teal)" }}
            />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-3 opacity-70">🎬</p>
            <p className="font-display text-ink text-sm tracking-widest">No clips found</p>
            <p className="font-display text-[11px] tracking-wide text-ink-faint mt-1">
              {hasFilters ? "Try clearing your filters" : "Uploaded videos will appear here"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {videos.map((v) => (
              <LibraryCard key={v.id} video={v} onOpen={() => setActive(v)} />
            ))}
          </div>
        )}
      </main>

      {active && (
        <VideoDetailModal
          video={active}
          onClose={() => setActive(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
function LibraryCard({ video, onOpen }: { video: LibraryVideo; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-xl overflow-hidden transition-all hover:opacity-90"
      style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
    >
      <div className="relative">
        <VideoThumb
          url={video.video_url}
          posterUrl={video.poster_url}
          provider={video.provider}
          streamUid={video.stream_uid}
          label={video.label}
          className="w-full"
        />
        {video.is_best && (
          <span className="absolute top-1.5 right-1.5 text-[13px]" style={{ color: "var(--gold)" }}>★</span>
        )}
        {video.day_number != null && (
          <span
            className="absolute top-1.5 left-1.5 font-display text-[9px] tracking-widest px-2 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "var(--gold)" }}
          >
            D{video.day_number}
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="font-display text-[12px] tracking-wide text-ink truncate">{video.label || "Untitled"}</p>
        {video.student_name && (
          <p className="font-display text-[10px] tracking-widest text-ink-faint truncate mt-0.5">{video.student_name}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {video.source_type && (
            <span className="font-display text-[8px] tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
              {video.source_type}
            </span>
          )}
          {video.provider && (
            <span className="font-display text-[8px] tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }}>
              {video.provider}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Detail / edit modal ─────────────────────────────────────────────────────
function VideoDetailModal({
  video,
  onClose,
  onUpdated,
  onDeleted,
}: {
  video: LibraryVideo;
  onClose: () => void;
  onUpdated: (v: LibraryVideo) => void;
  onDeleted: (id: string) => void;
}) {
  const [label, setLabel] = useState(video.label ?? "");
  const [tagsText, setTagsText] = useState((video.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patch(body: Record<string, unknown>, flag: string) {
    setBusy(flag);
    setErr(null);
    try {
      const res = await fetch(`/api/coach/students/${video.student_id}/videos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video.id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Update failed");
        return;
      }
      onUpdated(data as LibraryVideo);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function saveMeta() {
    setSaving(true);
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    await patch({ label: label.trim(), tags }, "save");
    setSaving(false);
  }

  async function toggleBest() {
    await patch({ is_best: !video.is_best }, "best");
  }

  async function handleDelete() {
    setBusy("delete");
    setErr(null);
    try {
      const res = await fetch(`/api/coach/videos?id=${video.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Delete failed");
        return;
      }
      onDeleted(video.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className="relative w-full max-w-lg my-8 rounded-2xl overflow-hidden"
        style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--glass-edge)" }}>
          <p className="font-display text-[11px] tracking-widest text-gold truncate">
            {video.student_name ?? "Video"}
          </p>
          <button
            onClick={onClose}
            className="font-display text-ink-faint hover:text-coral transition-colors text-lg leading-none px-2"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <VideoSlot url={video.video_url} label={video.label} />

          {err && (
            <div className="rounded-lg px-3 py-2 mt-3 font-display text-[11px] tracking-wide text-coral"
              style={{ background: "var(--coral-soft)", border: "1px solid rgba(255,107,94,0.3)" }}>
              {err}
            </div>
          )}

          {/* Label */}
          <label className="block mt-4">
            <span className="font-display text-[9px] tracking-widest text-ink-faint">LABEL</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg font-display text-[12px] tracking-wide outline-none"
              style={selectStyle}
            />
          </label>

          {/* Tags */}
          <label className="block mt-3">
            <span className="font-display text-[9px] tracking-widest text-ink-faint">TAGS (comma separated)</span>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="pop-up, bottom-turn…"
              className="w-full mt-1 px-3 py-2 rounded-lg font-display text-[12px] tracking-wide outline-none"
              style={selectStyle}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={saveMeta}
              disabled={saving || busy === "save"}
              className={chipBase}
              style={{ background: "var(--teal)", color: "var(--abyss)", border: "1px solid var(--teal)" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={toggleBest}
              disabled={busy === "best"}
              className={chipBase}
              style={selStyle(video.is_best)}
            >
              {video.is_best ? "★ Best" : "☆ Mark best"}
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className={`${chipBase} ml-auto`}
                style={{ background: "transparent", color: "var(--coral)", border: "1px solid rgba(255,107,94,0.3)" }}
              >
                Delete
              </button>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <span className="font-display text-[10px] tracking-widest text-ink-faint">Sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={busy === "delete"}
                  className={chipBase}
                  style={{ background: "var(--coral)", color: "#fff", border: "1px solid var(--coral)" }}
                >
                  {busy === "delete" ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className={chipBase}
                  style={selStyle(false)}
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
