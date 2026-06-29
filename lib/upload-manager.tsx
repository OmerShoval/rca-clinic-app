"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import * as tus from "tus-js-client";

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

export function UploadManagerProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  // Stores plain abort wrappers — the tus.Upload instance owns the actual transfer
  const abortors = useRef<Map<string, { abort(): void }>>(new Map());

  const enqueue = useCallback((params: EnqueueParams): string => {
    const id = makeId();

    setItems((prev) => [
      ...prev,
      {
        id,
        fileName: params.file.name,
        studentName: params.studentName,
        fileSize: params.file.size,
        progress: 0,
        status: "uploading",
      },
    ]);

    const isGif = params.file.type === "image/gif";

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
        chunkSize: isGif ? 6 * 1024 * 1024 : 50 * 1024 * 1024,
        metadata: supabaseMeta
          ? {
              bucketName: "rca-notes",
              objectName: supabaseMeta.objectPath,
              contentType: params.file.type,
              cacheControl: "3600",
            }
          : { filename: params.file.name, filetype: params.file.type },
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
          params.onComplete?.(resultUrl);

          // Atomic: persist the student_videos row so callers never forget
          if (params.persistVideo) {
            const { studentId, debriefId, label, dayNum, videoKind } = params.persistVideo;
            fetch(`/api/coach/students/${studentId}/videos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                video_url: resultUrl,
                label: label ?? "",
                day_number: dayNum ?? null,
                kind: videoKind ?? "session",
                debrief_id: debriefId ?? null,
              }),
            })
              .then(async (res) => {
                if (!res.ok) {
                  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                  console.error("[upload-manager] student_videos save failed", res.status, body);
                  params.onError?.(
                    `Upload succeeded but library save failed (${res.status}): ${(body as { error?: string }).error ?? "unknown"}`
                  );
                }
              })
              .catch((e: Error) => {
                console.error("[upload-manager] student_videos network error", e);
              });
          }
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

      const upload = new tus.Upload(params.file, opts);

      abortors.current.set(id, {
        abort() {
          aborted = true;
          upload.abort();
        },
      });

      upload.start();
    }

    if (isGif) {
      fetch("/api/coach/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: params.file.type,
          studentSlug: params.studentSlug,
          kind: params.kind,
        }),
      })
        .then((r) => {
          if (!r.ok)
            return r
              .json()
              .then((e: { error?: string }) => {
                throw new Error(e.error ?? `Server error ${r.status}`);
              });
          return r.json() as Promise<{ objectPath: string; publicUrl: string }>;
        })
        .then(({ objectPath, publicUrl }) =>
          startTus(null, publicUrl, { objectPath }),
        )
        .catch((err: Error) => {
          setItems((prev) =>
            prev.map((it) =>
              it.id === id
                ? { ...it, status: "failed" as const, error: err.message }
                : it,
            ),
          );
          params.onError?.(err.message);
        });
    } else {
      fetch("/api/coach/cf-upload-url", { method: "POST" })
        .then((r) => {
          if (!r.ok)
            return r
              .json()
              .then((e: { error?: string }) => {
                throw new Error(e.error ?? `CF error ${r.status}`);
              });
          return r.json() as Promise<{ uid: string; uploadUrl: string }>;
        })
        .then(({ uid, uploadUrl }) =>
          startTus(uploadUrl, `https://iframe.videodelivery.net/${uid}`),
        )
        .catch((err: Error) => {
          setItems((prev) =>
            prev.map((it) =>
              it.id === id
                ? { ...it, status: "failed" as const, error: err.message }
                : it,
            ),
          );
          params.onError?.(err.message);
        });
    }

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
