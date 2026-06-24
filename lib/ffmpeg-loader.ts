import type { FFmpeg } from "@ffmpeg/ffmpeg";

// @ffmpeg/core = single-threaded: no SharedArrayBuffer / COOP+COEP headers required
// (core-st was the old name, abandoned after 0.11.x; @ffmpeg/core@0.12.x is the successor)
const FFMPEG_CORE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js";
const FFMPEG_WASM_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm";

let instance: FFmpeg | null = null;

export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (instance) return instance;

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

export function clearFFmpegInstance() {
  if (instance) {
    instance.terminate();
    instance = null;
  }
}
