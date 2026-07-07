"use client";

import { useLanguage } from "@/lib/language-context";
import { StrategyView, type StrategyData } from "./strategy-view";

interface Props {
  studentName: string;
  strategy: StrategyData | null;
}

export function StrategyPageClient({ studentName, strategy }: Props) {
  const { t } = useLanguage();

  return (
    <main className="flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-nav gap-6 max-w-lg mx-auto">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 700px 350px at 50% 0%, rgba(139,92,246,0.06), transparent 65%)" }}
      />

      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-gold mb-1">{studentName}</p>
        <h1 className="font-display text-3xl text-ink leading-none">{t("strat_heading")}</h1>
        <p className="text-ink-faint text-sm mt-2">{t("strat_subtitle")}</p>
      </div>

      <StrategyView strategy={strategy} />
    </main>
  );
}
