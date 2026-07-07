// ============================================================
// lib/video.ts — single source of truth for video URL handling.
//
// Replaces the ~8 copies of provider-detection / CF-uid / thumbnail
// helpers that used to live in video-slot, hls-player, video-uploader,
// debrief-editor, debrief-detail-client, pattern-trail, strategy-nodes,
// step-node and the videos API route.
//
// A stored video_url is always one of:
//   • Cloudflare Stream  → https://iframe.videodelivery.net/<uid>
//   • Direct file        → …/*.mp4 | .mov | .webm | .m4v | .avi (incl. Supabase Storage)
//   • HLS manifest       → …/*.m3u8
//   • Animated image     → …/*.gif
//   • YouTube / Vimeo / Google Drive embed
//   • anything else      → treated as an external link
// ============================================================

import type { VideoProvider } from "@/lib/database.types";

export type { VideoProvider };

// ── URL pattern matchers ──────────────────────────────────────────────
const CF_UID_RE = /(?:iframe\.videodelivery\.net|videodelivery\.net|cloudflarestream\.com)\/([a-f0-9]{32,})/i;
const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/i;
const VIMEO_RE = /vimeo\.com/i;
const DRIVE_RE = /drive\.google\.com/i;
const GIF_RE = /\.gif(?:$|\?)/i;
const HLS_RE = /\.m3u8(?:$|\?)/i;
const DIRECT_RE = /\.(mp4|mov|webm|m4v|avi)(?:$|\?)/i;

/** Classify a stored video URL into a render/resolve strategy. */
export function detectProvider(url: string | null | undefined): VideoProvider {
  if (!url) return "link";
  if (CF_UID_RE.test(url)) return "cloudflare";
  if (YOUTUBE_RE.test(url)) return "youtube";
  if (VIMEO_RE.test(url)) return "vimeo";
  if (DRIVE_RE.test(url)) return "drive";
  if (GIF_RE.test(url)) return "gif";
  // HLS manifests and direct files both play in a native/HLS <video>; group as "direct".
  if (HLS_RE.test(url) || DIRECT_RE.test(url)) return "direct";
  return "link";
}

/** True when the URL is a raw HLS manifest (not a Cloudflare iframe URL). */
export function isHlsManifest(url: string | null | undefined): boolean {
  return !!url && HLS_RE.test(url);
}

/** Extract the 32+ hex Cloudflare Stream uid from any CF URL form, or null. */
export function extractStreamUid(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(CF_UID_RE);
  return m ? m[1] : null;
}

/** Cloudflare Stream HLS manifest URL for a uid. */
export function cfManifestUrl(uid: string): string {
  return `https://videodelivery.net/${uid}/manifest/video.m3u8`;
}

/** Cloudflare Stream canonical iframe/player URL for a uid. */
export function cfIframeUrl(uid: string): string {
  return `https://iframe.videodelivery.net/${uid}`;
}

/**
 * Cloudflare Stream still-frame thumbnail.
 * `time` defaults to 1s; callers rendering very short clips can pass "0s".
 */
export function cfThumbnailUrl(uid: string, height = 400, time = "1s"): string {
  return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=${time}&height=${height}`;
}

/** Cloudflare Stream animated preview (short looping gif) — for hover previews. */
export function cfAnimatedThumbnailUrl(uid: string, height = 400): string {
  return `https://videodelivery.net/${uid}/thumbnails/thumbnail.gif?height=${height}`;
}

/**
 * Best-effort poster/thumbnail URL for any video URL.
 * Returns null for direct/HLS files (no server-side thumbnail exists) and
 * for provider embeds we don't derive a still for here (YouTube/Vimeo/Drive
 * have their own oEmbed thumbnails handled at the call site if needed).
 */
export function posterUrlFor(url: string | null | undefined, height = 400): string | null {
  const uid = extractStreamUid(url);
  if (uid) return cfThumbnailUrl(uid, height);
  if (url && GIF_RE.test(url)) return url; // the gif itself is its own poster
  return null;
}

/** Build the provider-specific embeddable iframe src for YouTube/Vimeo/Drive. */
export function embedUrlFor(url: string, autoplay = true): string | null {
  // YouTube
  const yt =
    url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i);
  if (yt) {
    const params = autoplay ? "?autoplay=1&rel=0" : "?rel=0";
    return `https://www.youtube.com/embed/${yt[1]}${params}`;
  }
  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) {
    const params = autoplay ? "?autoplay=1" : "";
    return `https://player.vimeo.com/video/${vm[1]}${params}`;
  }
  // Google Drive
  const gd = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  return null;
}

// ── Upload classification / limits ────────────────────────────────────
export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
] as const;

export const IMAGE_MIME_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export const AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
] as const;

/** MIME → file extension, shared by every upload route. */
export const MIME_TO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export function extForMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? "bin";
}

export function isVideoFile(file: { type: string }): boolean {
  return file.type.startsWith("video/");
}

/** A real video (transcoded) goes to Cloudflare Stream; everything else to Supabase Storage. */
export function shouldUseCloudflareStream(file: { type: string }): boolean {
  return isVideoFile(file);
}

// Cloudflare Stream limits (kept in sync with app/api/coach/cf-upload-url).
export const CF_MAX_DURATION_S = 600; // 10 minutes
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB, matches the rca-notes bucket

/** Read a video file's duration in the browser (returns seconds, or null if unknown). */
export async function readVideoDuration(file: File): Promise<number | null> {
  if (typeof document === "undefined" || !isVideoFile(file)) return null;
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    const url = URL.createObjectURL(file);
    const done = (val: number | null) => {
      URL.revokeObjectURL(url);
      resolve(val);
    };
    el.onloadedmetadata = () =>
      done(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
    el.onerror = () => done(null);
    el.src = url;
  });
}

/** SHA-256 content hash of a file, hex — used for real dedup. Null if crypto unavailable. */
export async function fileChecksum(file: File): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}
