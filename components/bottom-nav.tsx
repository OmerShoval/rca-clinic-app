"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  slug: string;
}

export function BottomNav({ slug }: BottomNavProps) {
  const pathname = usePathname();
  const base = `/s/${slug}`;

  const tabs = [
    { href: `${base}/waves`,     label: "My Waves",  icon: "🌊" },
    { href: base,                label: "Home",      icon: "◎"  },
    { href: `${base}/home-base`, label: "Back Home", icon: "🏠" },
    { href: `${base}/ask`,       label: "Ask Omer",  icon: "💬" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
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
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors",
              active ? "text-teal" : "text-ink-faint"
            )}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="font-display text-[9px] tracking-[0.15em]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
