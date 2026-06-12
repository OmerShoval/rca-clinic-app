"use client";

import { cn } from "@/lib/utils";

export type VideoProvider = "YouTube" | "Vimeo" | "Drive" | "Direct" | "Link";

export function detectProvider(url: string): VideoProvider {
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) return "YouTube";
  if (/vimeo\.com\/\d+/.test(url)) return "Vimeo";
  if (/drive\.google\.com\/file\/d\//.test(url)) return "Drive";
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) return "Direct";
  return "Link";
}

export function extractEmbedUrl(url: string, provider: VideoProvider): string {
  if (provider === "YouTube") {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  }
  if (provider === "Vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  }
  if (provider === "Drive") {
    const match = url.match(/\/file\/d\/([^/]+)/);
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
  }
  return url;
}

interface VideoSlotProps {
  url?: string | null;
  label?: string;
  className?: string;
}

const providerIcon: Record<VideoProvider, string> = {
  YouTube: "▶",
  Vimeo:   "▶",
  Drive:   "▶",
  Direct:  "▶",
  Link:    "🔗",
};

export function VideoSlot({ url, label, className }: VideoSlotProps) {
  const provider = url ? detectProvider(url) : null;
  const filled = !!url;

  return (
    <div
      className={cn(
        "rounded-xl p-4 text-center transition-colors",
        filled
          ? "border border-teal/40 bg-teal/5"
          : "border-[1.5px] border-dashed border-[--glass-edge] hover:border-teal/60",
        className
      )}
    >
      <p className="text-xl mb-1">
        {filled ? providerIcon[provider!] : "🎥"}
      </p>
      <p className="font-display text-[13px] text-ink-faint">
        {filled ? provider : label ?? "Video"}
      </p>
      {filled && (
        <p className="text-[10px] text-ink-faint mt-1 truncate max-w-[180px] mx-auto">
          {url}
        </p>
      )}
      {!filled && (
        <p className="text-[10.5px] text-ink-faint mt-0.5">Paste URL in dashboard</p>
      )}
    </div>
  );
}
