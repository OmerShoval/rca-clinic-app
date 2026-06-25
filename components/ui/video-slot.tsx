"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { HlsPlayer } from "@/components/ui/hls-player";

export type VideoProvider =
  | "YouTube"
  | "Vimeo"
  | "Drive"
  | "CloudflareStream"
  | "Direct"
  | "GIF"
  | "Link";

export function detectProvider(url: string): VideoProvider {
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) return "YouTube";
  if (/vimeo\.com\/\d+/.test(url)) return "Vimeo";
  if (/drive\.google\.com\/file\/d\//.test(url)) return "Drive";
  if (/videodelivery\.net\/[a-f0-9]{32,}/.test(url)) return "CloudflareStream";
  if (/\.gif(\?|$)/i.test(url)) return "GIF";
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) return "Direct";
  return "Link";
}

function extractCFStreamUid(url: string): string | null {
  const m = url.match(/videodelivery\.net\/([a-f0-9]{32,})/);
  return m ? m[1] : null;
}

export function extractEmbedUrl(url: string, provider: VideoProvider): string {
  if (provider === "YouTube") {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match
      ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&autoplay=1`
      : url;
  }
  if (provider === "Vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match
      ? `https://player.vimeo.com/video/${match[1]}?color=2fd6c0&byline=0&portrait=0&autoplay=1`
      : url;
  }
  if (provider === "Drive") {
    const match = url.match(/\/file\/d\/([^/]+)/);
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
  }
  if (provider === "CloudflareStream") {
    const uid = extractCFStreamUid(url);
    return uid
      ? `https://iframe.videodelivery.net/${uid}?autoplay=true&muted=true&defaultTextTrack=off`
      : url;
  }
  return url;
}

interface VideoSlotProps {
  url?: string | null;
  label?: string;
  className?: string;
}

const SPEEDS = [0.25, 0.5, 1, 2] as const;

export function VideoSlot({ url, label, className }: VideoSlotProps) {
  const [expanded, setExpanded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  function applySpeed(rate: number) {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }

  if (!url) {
    return (
      <div
        className={cn("rounded-xl p-4 text-center", "border-[1.5px] border-dashed", className)}
        style={{ borderColor: "var(--glass-edge)" }}
      >
        <p className="text-xl mb-1">🎥</p>
        <p className="font-display text-[11px] tracking-widest text-ink-faint">
          {label ?? "Video"}
        </p>
        <p className="text-[10px] text-ink-faint mt-0.5">Clip coming soon</p>
      </div>
    );
  }

  const provider = detectProvider(url);

  // ── External link ────────────────────────────────────────────────────────────
  if (provider === "Link") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-80",
          className
        )}
        style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
      >
        <span className="text-lg">🔗</span>
        <div>
          <p className="font-display text-[11px] tracking-widest text-teal">
            {label ?? "Watch Clip"}
          </p>
          <p className="text-[10px] text-ink-faint truncate max-w-[220px]">{url}</p>
        </div>
      </a>
    );
  }

  // ── GIF ──────────────────────────────────────────────────────────────────────
  if (provider === "GIF") {
    return (
      <div
        className={cn("rounded-xl overflow-hidden", className)}
        style={{ background: "var(--depth)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label ?? "clip"}
          className="w-full h-auto block"
          style={{ maxHeight: "75vh", objectFit: "contain" }}
          loading="lazy"
        />
        {label && (
          <p className="font-display text-[10px] tracking-widest text-ink-faint px-3 py-2">
            {label}
          </p>
        )}
      </div>
    );
  }

  // ── Direct MP4 / MOV / WebM — with speed controls ───────────────────────────
  if (provider === "Direct") {
    return (
      <div
        className={cn("rounded-xl overflow-hidden", className)}
        style={{ background: "var(--depth)" }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full h-auto block"
          style={{ maxHeight: "75vh", background: "#000" }}
        />
        {/* Speed controls */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className="font-display text-[8px] tracking-widest text-ink-faint mr-1">
            SPEED
          </span>
          {SPEEDS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => applySpeed(rate)}
              className="font-display text-[9px] tracking-wide px-2 py-0.5 rounded transition-colors"
              style={
                playbackRate === rate
                  ? { background: "var(--teal)", color: "var(--abyss)" }
                  : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
              }
            >
              {rate}×
            </button>
          ))}
        </div>
        {label && (
          <p className="font-display text-[10px] tracking-widest text-ink-faint px-3 pb-2">
            {label}
          </p>
        )}
      </div>
    );
  }

  // ── Cloudflare Stream — custom HLS player (hls.js, speed controls, scrubber) ──
  if (provider === "CloudflareStream") {
    const uid = extractCFStreamUid(url);
    if (!uid) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={cn("block text-teal underline text-sm", className)}>
          {label ?? "Watch video"}
        </a>
      );
    }
    return <HlsPlayer uid={uid} label={label} className={className} />;
  }

  // ── YouTube / Vimeo / Drive — tap-to-load iframe ─────────────────────────────
  const embedUrl = extractEmbedUrl(url, provider);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={cn(
          "w-full rounded-xl overflow-hidden flex items-center justify-center gap-3 py-5 transition-opacity hover:opacity-80",
          className
        )}
        style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
      >
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--teal)", color: "var(--abyss)" }}
        >
          ▶
        </span>
        <div className="text-left">
          <p className="font-display text-[12px] tracking-widest text-teal">
            {label ?? "Watch Clip"}
          </p>
          <p className="font-display text-[9px] tracking-widest text-ink-faint">{provider}</p>
        </div>
      </button>
    );
  }

  return (
    <div className={cn("rounded-xl overflow-hidden", className)} style={{ background: "#000" }}>
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={label ?? "Video"}
        />
      </div>
    </div>
  );
}
