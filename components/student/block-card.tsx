import { VideoSlot } from "@/components/ui/video-slot";
import type { DebriefBlock } from "@/lib/database.types";

type BlockType = DebriefBlock["type"];

const META: Record<BlockType, { label: string; spineColor: string; tagColor: string; tagBg: string }> = {
  mistake:     { label: "Mistake",     spineColor: "var(--coral)", tagColor: "var(--coral)", tagBg: "var(--coral-soft)" },
  correction:  { label: "Correction",  spineColor: "var(--teal)",  tagColor: "var(--teal)",  tagBg: "var(--teal-soft)"  },
  improvement: { label: "Improvement", spineColor: "var(--teal)",  tagColor: "var(--teal)",  tagBg: "var(--teal-soft)"  },
  goal:        { label: "Goal",        spineColor: "var(--gold)",  tagColor: "var(--gold)",  tagBg: "var(--gold-soft)"  },
  next_step:   { label: "Next Step",   spineColor: "var(--gold)",  tagColor: "var(--gold)",  tagBg: "var(--gold-soft)"  },
};

interface Props {
  block: DebriefBlock;
}

export function BlockCard({ block }: Props) {
  const meta = META[block.type];
  const hasContent = block.title || block.body;
  if (!hasContent) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--glass)",
        border: "1px solid var(--glass-edge)",
        borderLeft: `3px solid ${meta.spineColor}`,
      }}
    >
      <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
        {/* Type badge */}
        <span
          className="font-display text-[10px] tracking-[0.2em] px-2 py-0.5 rounded self-start"
          style={{ color: meta.tagColor, background: meta.tagBg }}
        >
          {meta.label.toUpperCase()}
        </span>

        {/* Title */}
        {block.title && (
          <h3 className="text-ink text-base font-semibold leading-snug">{block.title}</h3>
        )}

        {/* Body */}
        {block.body && (
          <p className="text-ink-dim text-sm leading-relaxed whitespace-pre-wrap">{block.body}</p>
        )}

        {/* Felt sense quote */}
        {block.felt_sense_quote && (
          <blockquote
            className="text-sm italic leading-relaxed px-3 py-2 rounded-xl"
            style={{
              color: meta.tagColor,
              background: meta.tagBg,
              borderLeft: `2px solid ${meta.spineColor}`,
            }}
          >
            &ldquo;{block.felt_sense_quote}&rdquo;
          </blockquote>
        )}

        {/* Metadata row */}
        {(block.where_on_wave || block.why_it_happened || block.timestamp_marker) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {block.where_on_wave && (
              <span className="font-display text-[10px] tracking-widest text-ink-faint">
                📍 {block.where_on_wave}
              </span>
            )}
            {block.timestamp_marker && (
              <span className="font-display text-[10px] tracking-widest text-ink-faint">
                ⏱ {block.timestamp_marker}
              </span>
            )}
            {block.why_it_happened && (
              <span className="text-[11px] text-ink-faint leading-relaxed w-full mt-0.5">
                {block.why_it_happened}
              </span>
            )}
          </div>
        )}

        {/* Primary video */}
        {block.video_url && (
          <VideoSlot
            url={block.video_url}
            label={block.type === "improvement" ? "Before" : block.type === "goal" ? "Goal video" : block.type === "next_step" ? "Next step video" : "Watch clip"}
            className="mt-1"
          />
        )}

        {/* Secondary video */}
        {block.video_url_secondary && (
          <VideoSlot
            url={block.video_url_secondary}
            label={block.type === "improvement" ? "After" : "Reference wave"}
            className="mt-1"
          />
        )}
      </div>
    </div>
  );
}
