"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Globe } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { Lang } from "@/lib/i18n";

const languages: { code: Lang; nativeLabel: string; flag: string }[] = [
  { code: "en", nativeLabel: "English", flag: "🇺🇸" },
  { code: "he", nativeLabel: "עברית",   flag: "🇮🇱" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = languages.find((l) => l.code === lang) ?? languages[0];

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref} dir="ltr">
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full transition-all active:scale-95"
        style={{
          padding: "7px 14px 7px 10px",
          fontSize: 13,
          fontFamily: lang === "he"
            ? "var(--font-hebrew), system-ui, sans-serif"
            : "var(--font-sans), system-ui, sans-serif",
          fontWeight: 500,
          background: open
            ? "rgba(47,214,192,0.18)"
            : "rgba(13,26,31,0.85)",
          border: open
            ? "1.5px solid rgba(47,214,192,0.7)"
            : "1.5px solid rgba(47,214,192,0.45)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          color: "var(--teal)",
          boxShadow: open
            ? "0 0 16px rgba(47,214,192,0.25), 0 4px 16px rgba(0,0,0,0.4)"
            : "0 0 10px rgba(47,214,192,0.12), 0 4px 14px rgba(0,0,0,0.35)",
        }}
      >
        <Globe style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.85 }} />
        <span style={{ fontSize: 15, lineHeight: 1 }}>{selected.flag}</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{selected.nativeLabel}</span>
        <ChevronDown
          style={{
            width: 13,
            height: 13,
            color: "var(--ink-faint)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute left-0 mt-2 w-44 rounded-xl overflow-hidden animate-fade-in"
          style={{
            background: "rgba(10,22,28,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(47,214,192,0.22)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(47,214,192,0.08)",
            zIndex: 200,
          }}
        >
          {languages.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-3 text-left transition-colors"
                style={{
                  background: active ? "rgba(47,214,192,0.1)" : "transparent",
                  color: active ? "var(--teal)" : "var(--ink)",
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  fontFamily:
                    l.code === "he"
                      ? "var(--font-hebrew), system-ui, sans-serif"
                      : "var(--font-sans), system-ui, sans-serif",
                  borderBottom: l.code === "en" ? "1px solid rgba(255,255,255,0.07)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{l.flag}</span>
                <span className="flex-1">{l.nativeLabel}</span>
                {active && (
                  <Check style={{ width: 14, height: 14, color: "var(--teal)", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
