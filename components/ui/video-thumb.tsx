"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  detectProvider,
  extractStreamUid,
  cfThumbnailUrl,
  type VideoProvider,
} from "@/lib/video";

interface VideoThumbProps {
  /** The stored video URL. */
  url?: string | null;
  /** Optional precomputed poster URL (e.g. student_videos.poster_url). */
  posterUrl?: string | null;
  /** Optional precomputed provider (avoids re-detecting). */
  provider?: VideoProvider | null;
  /** Optional precomputed Cloudflare Stream uid. */
  streamUid?: string | null;
  label?: string | null;
  className?: string;
  /** Thumbnail pixel height requested from Cloudflare (default 400). */
  height?: number;
  /** Show a ▶ play affordance overlay (default true). */
  showPlayIcon?: boolean;
}

/**
 * Poster/thumbnail for any library video, with graceful fallbacks.
 *
 * Resolution order: explicit posterUrl → Cloudflare Stream still →
 * the GIF/image itself → a 🎬 placeholder. Any image load error (e.g. a
 * Cloudflare still that 404s while the clip is still transcoding) falls back
 * to the placeholder instead of a broken-image icon.
 *
 * Always renders inside a 16:9 box so grids never shift layout.
 */
export function VideoThumb({
  url,
  posterUrl,
  provider,
  streamUid,
  label,
  className,
  height = 400,
  showPlayIcon = true,
}: VideoThumbProps) {
  const [errored, setErrored] = useState(false);

  const prov = provider ?? (url ? detectProvider(url) : "link");
  const uid = streamUid ?? (url ? extractStreamUid(url) : null);

  // Pick the best available still image.
  let src: string | null = posterUrl ?? null;
  if (!src && uid) src = cfThumbnailUrl(uid, height);
  if (!src && url && prov === "gif") src = url;
  if (!src && url && prov === "direct") src = null; // no server-side still for raw files

  const showImage = !!src && !errored;

  return (
    <div
      className={cn("relative overflow-hidden bg-black", className)}
      style={{ aspectRatio: "16/9" }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={label ?? "video thumbnail"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-70">
          🎬
        </div>
      )}

      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: "rgba(255,255,255,0.9)",
              color: "#000",
              fontSize: 14,
              paddingLeft: 3,
            }}
          >
            ▶
          </span>
        </div>
      )}
    </div>
  );
}
