import { MutableRefObject } from "react";

export interface UploadOptions {
  file: File;
  studentSlug: string;
  kind: "audio" | "video" | "cover" | "node";
  onProgress?: (pct: number) => void;
  /** Pass a ref to get access to the XHR so callers can abort() it. */
  xhrRef?: MutableRefObject<XMLHttpRequest | null>;
}

/**
 * Upload a file directly to Supabase Storage via a presigned URL,
 * completely bypassing Vercel's serverless function payload limit.
 *
 * Flow:
 *  1. POST /api/coach/upload-url  → server creates a signed upload URL (service role, coach-auth protected)
 *  2. PUT  <signedUrl>            → browser uploads file directly to Supabase (no Vercel in the loop)
 *  3. Returns the permanent public URL of the uploaded file.
 */
export async function uploadFileDirect({
  file,
  studentSlug,
  kind,
  onProgress,
  xhrRef,
}: UploadOptions): Promise<string> {
  // Step 1 — get presigned URL from our server
  const urlRes = await fetch("/api/coach/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, studentSlug, kind }),
  });

  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Server error ${urlRes.status}`);
  }

  const { signedUrl, publicUrl } = (await urlRes.json()) as {
    signedUrl: string;
    publicUrl: string;
  };

  // Step 2 — PUT file body directly to Supabase (bypasses Vercel entirely)
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (xhrRef) xhrRef.current = xhr;

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.addEventListener("load", () => {
      if (xhrRef) xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(publicUrl);
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () => {
      if (xhrRef) xhrRef.current = null;
      reject(new Error("Network error — check your connection"));
    });

    xhr.addEventListener("abort", () => {
      if (xhrRef) xhrRef.current = null;
      reject(new Error("cancelled"));
    });

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(file);
  });
}
