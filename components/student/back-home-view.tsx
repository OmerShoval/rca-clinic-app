"use client";

import { useState } from "react";
import { VideoSlot } from "@/components/ui/video-slot";
import { useLanguage } from "@/lib/language-context";
import type { Translation } from "@/lib/database.types";

type Environment = "israel_ocean" | "wave_pool";

export function BackHomeView({
  israelTranslation,
  wavePoolTranslation,
}: {
  israelTranslation: Translation | null;
  wavePoolTranslation: Translation | null;
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Environment>("israel_ocean");

  const envMeta = {
    israel_ocean: {
      labelKey: "bh_israel",
      color: "var(--teal)",
      bg: "var(--teal-soft)",
      border: "rgba(47,214,192,0.3)",
      emoji: "🌊",
    },
    wave_pool: {
      labelKey: "bh_pool",
      color: "var(--gold)",
      bg: "var(--gold-soft)",
      border: "rgba(224,182,79,0.3)",
      emoji: "⚡",
    },
  };

  const translations: Record<Environment, Translation | null> = {
    israel_ocean: israelTranslation,
    wave_pool: wavePoolTranslation,
  };

  const current = translations[activeTab];
  const meta = envMeta[activeTab];
  const hasContent = current && (
    current.whats_different ||
    current.try_first ||
    current.on_wave_reminder ||
    current.video_url ||
    current.personal_note_url
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
      >
        {(["israel_ocean", "wave_pool"] as Environment[]).map((env) => {
          const m = envMeta[env];
          const active = activeTab === env;
          return (
            <button
              key={env}
              onClick={() => setActiveTab(env)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-display text-[11px] tracking-widest transition-all"
              style={
                active
                  ? { background: m.bg, color: m.color, border: `1px solid ${m.border}` }
                  : { background: "transparent", color: "var(--ink-faint)", border: "1px solid transparent" }
              }
            >
              {m.emoji} {t(m.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {!hasContent ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ border: "1.5px dashed var(--glass-edge)" }}
        >
          <p className="text-4xl mb-3">{meta.emoji}</p>
          <p className="font-display text-ink text-xl mb-1">{t(meta.labelKey)}</p>
          <p className="text-ink-dim text-sm">{t("bh_coming")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* What's different */}
          {current?.whats_different && (
            <div
              className="rounded-2xl px-4 pt-4 pb-4"
              style={{
                background: "var(--glass)",
                border: "1px solid var(--glass-edge)",
                borderInlineStart: `3px solid ${meta.color}`,
              }}
            >
              <p className="font-display text-[10px] tracking-[0.2em] mb-2" style={{ color: meta.color }}>
                {t("bh_whats_diff")}
              </p>
              <p className="text-ink-dim text-sm leading-relaxed whitespace-pre-wrap">{current.whats_different}</p>
            </div>
          )}

          {/* Try first */}
          {current?.try_first && (
            <div
              className="rounded-2xl px-4 pt-4 pb-4"
              style={{
                background: "var(--glass)",
                border: "1px solid var(--glass-edge)",
                borderInlineStart: `3px solid ${meta.color}`,
              }}
            >
              <p className="font-display text-[10px] tracking-[0.2em] mb-2" style={{ color: meta.color }}>
                {t("bh_try_first")}
              </p>
              <p className="text-ink-dim text-sm leading-relaxed whitespace-pre-wrap">{current.try_first}</p>
            </div>
          )}

          {/* On-wave reminder */}
          {current?.on_wave_reminder && (
            <div
              className="rounded-2xl px-4 py-4 text-center"
              style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
            >
              <p className="font-display text-[10px] tracking-[0.2em] mb-2" style={{ color: meta.color }}>
                {t("bh_on_wave")}
              </p>
              <p className="text-ink text-base font-medium leading-snug">{current.on_wave_reminder}</p>
            </div>
          )}

          {/* Reference video */}
          {current?.video_url && (
            <VideoSlot url={current.video_url} label={t("bh_watch_ref")} />
          )}

          {/* Voice note */}
          {current?.personal_note_url && (
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
            >
              <p className="font-display text-[10px] tracking-[0.2em] text-ink-faint mb-3">
                {t("bh_voice_note")}
              </p>
              <audio
                src={current.personal_note_url}
                controls
                className="w-full"
                style={{ filter: "invert(1) hue-rotate(180deg)", height: "36px" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
