import * as tus from "tus-js-client";
import { RefObject } from "react";

export interface Abortable {
  abort(): void;
}

export interface UploadOptions {
  file: File;
  studentSlug: string;
  kind: "audio" | "video" | "cover" | "node";
  onProgress?: (pct: number) => void;
  /** Pass a ref to get access to the upload so callers can abort() it. */
  uploadRef?: RefObject<Abortable | null>;
}

/**
 * Upload a file directly to Supabase Storage via the TUS resumable-upload
 * protocol, completely bypassing Vercel's serverless function payload limit.
 *
 * Flow:
 *  1. POST /api/coach/upload-url  → server (coach-auth gated) generates the
 *     object path and returns the permanent public URL.
 *  2. tus-js-client chunked PUT → directly to Supabase TUS endpoint.
 *     Resumable: if the connection drops, the upload continues from the last
 *     successfully transferred byte on retry.
 *  3. Returns the permanent public URL of the uploaded file.
 */
export async function uploadFileDirect({
  file,
  studentSlug,
  kind,
  onProgress,
  uploadRef,
}: UploadOptions): Promise<string> {
  // Step 1 — get the object path + public URL from our server
  const urlRes = await fetch("/api/coach/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, studentSlug, kind }),
  });

  if (!urlRes.ok) {
    const err = (await urlRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Server error ${urlRes.status}`);
  }

  const { objectPath, publicUrl } = (await urlRes.json()) as {
    objectPath: string;
    publicUrl: string;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Step 2 — TUS resumable upload directly to Supabase (no Vercel in the loop)
  return new Promise<string>((resolve, reject) => {
    let aborted = false;

    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "rca-notes",
        objectName: objectPath,
        contentType: file.type,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // 6 MB chunks
      onProgress(bytesUploaded, bytesTotal) {
        if (onProgress && bytesTotal > 0) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess() {
        if (uploadRef) uploadRef.current = null;
        resolve(publicUrl);
      },
      onError(error) {
        if (uploadRef) uploadRef.current = null;
        if (aborted) {
          reject(new Error("cancelled"));
        } else {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
    });

    if (uploadRef) {
      uploadRef.current = {
        abort() {
          aborted = true;
          upload.abort();
        },
      };
    }

    upload.start();
  });
}

// ── Cloudflare Stream variant ─────────────────────────────────────────────────
// Uploads video directly to CF Stream (bypasses Vercel + Supabase entirely).
// CF Stream transcodes to HLS, generates thumbnails and I-frame playlists,
// and serves from its global edge CDN.

export interface StreamUploadOptions {
  file: File;
  onProgress?: (pct: number) => void;
  uploadRef?: RefObject<Abortable | null>;
}

export async function uploadVideoToStream({
  file,
  onProgress,
  uploadRef,
}: StreamUploadOptions): Promise<string> {
  // Step 1 — server (coach-auth gated) requests a one-time TUS upload URL from CF
  const urlRes = await fetch("/api/coach/cf-upload-url", { method: "POST" });

  if (!urlRes.ok) {
    const err = (await urlRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `CF Stream error ${urlRes.status}`);
  }

  const { uid, uploadUrl } = (await urlRes.json()) as {
    uid: string;
    uploadUrl: string;
  };

  // Step 2 — TUS-upload directly to CF Stream's pre-created resource URL.
  // `uploadUrl` is the location of the resource CF already created, so we use
  // `uploadUrl` (not `endpoint`) — tus-js-client jumps straight to PATCH.
  return new Promise<string>((resolve, reject) => {
    let aborted = false;

    const upload = new tus.Upload(file, {
      uploadUrl,                          // pre-created: skip the POST creation step
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 50 * 1024 * 1024,        // CF recommends 50 MB chunks
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (onProgress && bytesTotal > 0) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess() {
        if (uploadRef) uploadRef.current = null;
        // Store the embed URL — VideoSlot and VideoUploader detect this pattern
        resolve(`https://iframe.videodelivery.net/${uid}`);
      },
      onError(error) {
        if (uploadRef) uploadRef.current = null;
        if (aborted) {
          reject(new Error("cancelled"));
        } else {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
    });

    if (uploadRef) {
      uploadRef.current = {
        abort() {
          aborted = true;
          upload.abort();
        },
      };
    }

    upload.start();
  });
}

// ── Student variant ────────────────────────────────────────────────────────────
// Same TUS flow but hits the student-auth-gated endpoint and accepts no `kind`.

export interface StudentUploadOptions {
  file: File;
  onProgress?: (pct: number) => void;
  uploadRef?: RefObject<Abortable | null>;
}

export async function uploadStudentClip({
  file,
  onProgress,
  uploadRef,
}: StudentUploadOptions): Promise<string> {
  const urlRes = await fetch("/api/student/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });

  if (!urlRes.ok) {
    const err = (await urlRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Server error ${urlRes.status}`);
  }

  const { objectPath, publicUrl } = (await urlRes.json()) as {
    objectPath: string;
    publicUrl: string;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return new Promise<string>((resolve, reject) => {
    let aborted = false;

    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "rca-notes",
        objectName: objectPath,
        contentType: file.type,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onProgress(bytesUploaded, bytesTotal) {
        if (onProgress && bytesTotal > 0) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess() {
        if (uploadRef) uploadRef.current = null;
        resolve(publicUrl);
      },
      onError(error) {
        if (uploadRef) uploadRef.current = null;
        if (aborted) {
          reject(new Error("cancelled"));
        } else {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
    });

    if (uploadRef) {
      uploadRef.current = {
        abort() {
          aborted = true;
          upload.abort();
        },
      };
    }

    upload.start();
  });
}
