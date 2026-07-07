"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import * as tus from "tus-js-client";
import {
  shouldUseCloudflareStream,
  isVideoFile,
  readVideoDuration,
  fileChecksum,
  detectProvider,
  extractStreamUid,
  posterUrlFor,
  MAX_UPLOAD_BYTES,
  CF_MAX_DURATION_S,
} from "@/lib/video";

export interface UploadItem {
  id: string;
  fileName: string;
  studentName: string;
  fileSize: number;
  progress: number;
  status: "uploading" | "done" | "failed";
  resultUrl?: string;
  error?: string;
}

export interface PersistVideoParams {
  studentId: string;
  debriefId?: string | null;
  label?: string;
  dayNum?: number | null;
  videoKind?: "session" | "node" | "reference";
  sourceType?: import("@/lib/database.types").VideoSourceType;
  sourceId?: string;
  tags?: string[];
}

export interface EnqueueParams {
  file: File;
  studentSlug: string;
  studentName: string;
  kind: "audio" | "video" | "cover" | "node";
  /** When set, the manager POSTs to student_videos on upload success — no caller code needed. */
  persistVideo?: PersistVideoParams;
  onComplete?: (url: string) => void;
  onError?: (message: string) => void;
}

interface UploadManagerValue {
  items: UploadItem[];
  activeCount: number;
  enqueue: (params: EnqueueParams) => string;
  cancel: (id: string) => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<UploadManagerValue | null>(null);

export function useUploadManager(): UploadManagerValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUploadManager must be inside UploadManagerProvider");
  return ctx;
}

/** Returns null instead of throwing — safe for components that may render outside the provider. */
export function useUploadManagerSafe(): UploadManagerValue | null {
  return useContext(Ctx);
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function humanBytes(n: number): string {
  return `${Math.round(n / (1024 * 1024))} MB`;
}

export function UploadManagerProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  // Stores plain abort wrappers — the tus.Upload instance owns the actual transfer
  const abortors = useRef<Map<string, { abort(): void }>>(new Map());

  const enqueue = useCallback((params: EnqueueParams): string => {
    const id = makeId();
    const { file } = params;

    setItems((prev) => [
      ...prev,
      {
        id,
        fileName: file.name,
        studentName: params.studentName,
        fileSize: file.size,
        progress: 0,
        status: "uploading",
      },
    ]);

    const failItem = (message: string) => {
      abortors.current.delete(id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: "failed" as const, error: message } : it,
        ),
      );
      params.onError?.(message);
    };

    // Metadata capture is async (duration probe + checksum), so the actual work
    // runs in an async function while `enqueue` returns the id synchronously.
    async function run() {
      // ── Capture File metadata up front ──────────────────────────────────
      const size_bytes = file.size;
      const mime_type = file.type;
      const original_filename = file.name;
      const duration_s = await readVideoDuration(file); // null for non-videos
      const checksum = await fileChecksum(file);

      // ── Client-side validation ──────────────────────────────────────────
      if (size_bytes > MAX_UPLOAD_BYTES) {
        failItem(
          `File is ${humanBytes(size_bytes)}, over the ${humanBytes(MAX_UPLOAD_BYTES)} limit`,
        );
        return;
      }
      if (isVideoFile(file) && duration_s != null && duration_s > CF_MAX_DURATION_S) {
        failItem("Video is longer than 10 min (Cloudflare limit)");
        return;
      }

      const useCloudflare = shouldUseCloudflareStream(file);

      // ── Persist the student_videos row on upload success ────────────────
      async function persist(resultUrl: string) {
        if (!params.persistVideo) return;
        const {
          studentId,
          debriefId,
          label,
          dayNum,
          videoKind,
          sourceType,
          sourceId,
          tags,
        } = params.persistVideo;

        const body = JSON.stringify({
          video_url: resultUrl,
          label: label ?? "",
          day_number: dayNum ?? null,
          kind: videoKind ?? "session",
          debrief_id: debriefId ?? null,
          provider: detectProvider(resultUrl),
          stream_uid: extractStreamUid(resultUrl),
          poster_url: posterUrlFor(resultUrl),
          duration_s,
          size_bytes,
          mime_type,
          original_filename,
          tags: tags ?? undefined,
          source_type: sourceType ?? undefined,
          source_id: sourceId ?? undefined,
          checksum: checksum ?? undefined,
        });

        const attempt = async () => {
          const res = await fetch(`/api/coach/students/${studentId}/videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          if (!res.ok) {
            const b = (await res
              .json()
              .catch(() => ({ error: `HTTP ${res.status}` }))) as { error?: string };
            throw new Error(b.error ?? `HTTP ${res.status}`);
          }
        };

        // The upload already succeeded; a failed library save would otherwise
        // silently orphan the file. Retry once, then surface via onError while
        // keeping the item "done" (the bytes are safely stored).
        try {
          await attempt();
        } catch {
          await new Promise((r) => setTimeout(r, 800));
          try {
            await attempt();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[upload-manager] student_videos save failed after retry", msg);
            params.onError?.(`Upload succeeded but library save failed: ${msg}`);
          }
        }
      }

      function startTus(
        uploadUrl: string | null,
        resultUrl: string,
        supabaseMeta?: { objectPath: string },
      ) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        let aborted = false;

        const opts: tus.UploadOptions = {
          retryDelays: [0, 3000, 5000, 10000, 20000],
          chunkSize: useCloudflare ? 50 * 1024 * 1024 : 6 * 1024 * 1024,
          metadata: supabaseMeta
            ? {
                bucketName: "rca-notes",
                objectName: supabaseMeta.objectPath,
                contentType: file.type,
                cacheControl: "3600",
              }
            : { filename: file.name, filetype: file.type },
          onProgress(bytesUploaded: number, bytesTotal: number) {
            if (bytesTotal > 0) {
              const pct = Math.round((bytesUploaded / bytesTotal) * 100);
              setItems((prev) =>
                prev.map((it) => (it.id === id ? { ...it, progress: pct } : it)),
              );
            }
          },
          onSuccess() {
            abortors.current.delete(id);
            setItems((prev) =>
              prev.map((it) =>
                it.id === id
                  ? { ...it, status: "done" as const, progress: 100, resultUrl }
                  : it,
              ),
            );
            // Fire the result callback regardless of whether the library save
            // succeeds — the upload itself is done.
            params.onComplete?.(resultUrl);
            void persist(resultUrl);
          },
          onError(err: tus.DetailedError | Error) {
            abortors.current.delete(id);
            if (aborted) {
              setItems((prev) => prev.filter((it) => it.id !== id));
              return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            setItems((prev) =>
              prev.map((it) =>
                it.id === id ? { ...it, status: "failed" as const, error: msg } : it,
              ),
            );
            params.onError?.(msg);
          },
        };

        if (supabaseMeta) {
          opts.endpoint = `${supabaseUrl}/storage/v1/upload/resumable`;
          opts.headers = { Authorization: `Bearer ${anonKey}`, "x-upsert": "false" };
          opts.uploadDataDuringCreation = true;
          opts.removeFingerprintOnSuccess = true;
        } else {
          opts.uploadUrl = uploadUrl!;
        }

        const upload = new tus.Upload(file, opts);

        abortors.current.set(id, {
          abort() {
            aborted = true;
            upload.abort();
          },
        });

        upload.start();
      }

      // ── Route real videos to Cloudflare Stream; everything else to Supabase ──
      if (useCloudflare) {
        try {
          const r = await fetch("/api/coach/cf-upload-url", { method: "POST" });
          if (!r.ok) {
            const e = (await r.json().catch(() => ({}))) as { error?: string };
            throw new Error(e.error ?? `CF error ${r.status}`);
          }
          const { uid, uploadUrl } = (await r.json()) as { uid: string; uploadUrl: string };
          startTus(uploadUrl, `https://iframe.videodelivery.net/${uid}`);
        } catch (err) {
          failItem(err instanceof Error ? err.message : String(err));
        }
      } else {
        try {
          const r = await fetch("/api/coach/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contentType: file.type,
              studentSlug: params.studentSlug,
              kind: params.kind,
            }),
          });
          if (!r.ok) {
            const e = (await r.json().catch(() => ({}))) as { error?: string };
            throw new Error(e.error ?? `Server error ${r.status}`);
          }
          const { objectPath, publicUrl } = (await r.json()) as {
            objectPath: string;
            publicUrl: string;
          };
          startTus(null, publicUrl, { objectPath });
        } catch (err) {
          failItem(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void run();

    return id;
  }, []);

  const cancel = useCallback((id: string) => {
    const abortor = abortors.current.get(id);
    if (abortor) {
      abortor.abort();
      abortors.current.delete(id);
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const activeCount = items.filter((i) => i.status === "uploading").length;

  return (
    <Ctx.Provider value={{ items, activeCount, enqueue, cancel, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}
