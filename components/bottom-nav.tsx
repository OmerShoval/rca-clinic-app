"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

interface BottomNavProps {
  slug: string;
}

export function BottomNav({ slug }: BottomNavProps) {
  const pathname = usePathname();
  const base = `/s/${slug}`;
  const { t } = useLanguage();

  const tabs = [
    { href: `${base}/waves`,    labelKey: "nav_my_waves",    icon: "🌊" },
    { href: base,               labelKey: "nav_home",        icon: "◎"  },
    { href: `${base}/patterns`, labelKey: "nav_my_patterns", icon: "🗺️" },
    { href: `${base}/training`, labelKey: "nav_training",    icon: "🎯" },
    { href: `${base}/home-base`,labelKey: "nav_back_home",   icon: "🏠" },
    { href: `${base}/ask`,      labelKey: "nav_ask_omer",    icon: "💬" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch pb-safe px-safe"
      style={{
        background: "rgba(7,15,21,0.92)",
        borderTop: "1px solid var(--glass-edge)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {tabs.map((tab) => {
        const active =
          tab.href === base
            ? pathname === base
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors",
              active ? "text-teal" : "text-ink-faint"
            )}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="font-display text-[9px] tracking-[0.1em] max-w-full truncate px-0.5">{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
