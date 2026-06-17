"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { Lang } from "@/lib/i18n";

const languages: { code: Lang; label: string; nativeLabel: string; flag: string }[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸" },
  { code: "he", label: "Hebrew",  nativeLabel: "עברית",   flag: "🇮🇱" },
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
        className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-all"
        style={{
          fontSize: 13,
          background: open ? "rgba(47,214,192,0.12)" : "rgba(255,255,255,0.07)",
          border: open
            ? "1px solid rgba(47,214,192,0.45)"
            : "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "var(--ink)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        }}
      >
        <span style={{ fontSize: 15 }}>{selected.flag}</span>
        <span style={{ fontFamily: "var(--font-sans), system-ui" }}>
          {selected.nativeLabel}
        </span>
        <ChevronDown
          style={{
            width: 14,
            height: 14,
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
          className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden animate-fade-in"
          style={{
            background: "rgba(10,22,28,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            zIndex: 200,
          }}
        >
          {languages.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors"
                style={{
                  background: active ? "rgba(47,214,192,0.09)" : "transparent",
                  color: active ? "var(--teal)" : "var(--ink)",
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  /* Use Hebrew font for the Hebrew row */
                  fontFamily:
                    l.code === "he"
                      ? "var(--font-hebrew), system-ui, sans-serif"
                      : "var(--font-sans), system-ui, sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 16 }}>{l.flag}</span>
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
