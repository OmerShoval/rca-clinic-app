"use client";

import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className="flex rounded-full p-0.5"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.13)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        gap: 2,
      }}
      dir="ltr"
    >
      <button
        onClick={() => setLang("en")}
        className="rounded-full transition-all"
        style={{
          padding: "3px 12px",
          fontSize: 11,
          fontFamily: "var(--font-sans), system-ui, sans-serif",
          fontWeight: 600,
          letterSpacing: "0.06em",
          ...(lang === "en"
            ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.3)" }
            : { background: "transparent", color: "rgba(241,238,230,0.38)", border: "1px solid transparent" }),
        }}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        onClick={() => setLang("he")}
        className="rounded-full transition-all"
        style={{
          padding: "3px 12px",
          fontSize: 13,
          fontFamily: "var(--font-hebrew), system-ui, sans-serif",
          fontWeight: 500,
          letterSpacing: "0.02em",
          ...(lang === "he"
            ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid rgba(47,214,192,0.3)" }
            : { background: "transparent", color: "rgba(241,238,230,0.38)", border: "1px solid transparent" }),
        }}
        aria-pressed={lang === "he"}
      >
        עב
      </button>
    </div>
  );
}
