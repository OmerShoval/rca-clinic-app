"use client";

import { useLanguage } from "@/lib/language-context";

export function AskPageHeader() {
  const { t } = useLanguage();
  return (
    <section>
      <p className="font-display text-coral text-[11px] tracking-[0.35em] mb-1">{t("ask_label")}</p>
      <h1 className="font-display text-ink text-[clamp(32px,8vw,48px)] leading-none">
        {t("ask_heading")}
      </h1>
      <p className="text-ink-dim text-sm mt-2">{t("ask_subtitle")}</p>
    </section>
  );
}
