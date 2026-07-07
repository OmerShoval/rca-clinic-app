import type { FFmpeg } from "@ffmpeg/ffmpeg";

// Self-hosted from public/ffmpeg/ — no unpkg dependency at runtime.
// Files are served from Vercel CDN in production.
const FFMPEG_CORE_URL = "/ffmpeg/ffmpeg-core.js";
const FFMPEG_WASM_URL = "/ffmpeg/ffmpeg-core.wasm";

let instance: FFmpeg | null = null;
// Cache the in-flight load Promise (not just the resolved instance) so two
// simultaneous callers share a single WASM load / one FFmpeg instance.
let loadPromise: Promise<FFmpeg> | null = null;

async function doLoad(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");

  const ff = new FFmpeg();
  if (onProgress) {
    ff.on("progress", ({ progress }) => {
      onProgress(Math.min(99, Math.round(progress * 100)));
    });
  }

  await ff.load({
    coreURL: await toBlobURL(FFMPEG_CORE_URL, "text/javascript"),
    wasmURL: await toBlobURL(FFMPEG_WASM_URL, "application/wasm"),
  });

  instance = ff;
  return ff;
}

export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (instance) return instance;
  if (loadPromise) return loadPromise;

  loadPromise = doLoad(onProgress).catch((err) => {
    // Allow a retry after a failed load rather than caching the rejection forever.
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

export function clearFFmpegInstance() {
  if (instance) {
    instance.terminate();
    instance = null;
  }
  loadPromise = null;
}
