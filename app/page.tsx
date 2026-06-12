"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface StudentResult {
  id: string;
  full_name: string;
  slug: string;
  stage: number;
}

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showWipe, setShowWipe] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: check if a valid session already exists → skip login
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.slug) {
          router.replace(`/s/${data.slug}`);
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  const fetchResults = useCallback((q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/students/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setActiveIndex(-1);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 180);
  };

  const handleSelect = async (student: StudentResult) => {
    setResults([]);
    setQuery(student.full_name);

    // Create session
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: student.slug }),
    });

    if (reduce) {
      router.push(`/s/${student.slug}`);
      return;
    }

    // Trigger wave-wipe then navigate
    setShowWipe(true);
    setTimeout(() => router.push(`/s/${student.slug}`), 1050);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setResults([]);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-abyss flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="font-display text-teal text-sm tracking-widest"
        >
          Loading
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-abyss flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 400px at 50% 20%, rgba(47,214,192,0.07), transparent 70%)",
        }}
      />

      {/* Logo + tagline */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10 relative z-10"
      >
        <p className="font-display text-teal text-[13px] tracking-[0.35em] mb-2">
          Ocean Athlete
        </p>
        <h1 className="font-display text-ink text-[clamp(40px,10vw,64px)] leading-none mb-3">
          Your Space
        </h1>
        <p className="text-ink-dim text-sm">Enter your name to open your coaching space</p>
      </motion.div>

      {/* Search input + dropdown */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm z-10"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Your name…"
          autoComplete="off"
          autoFocus
          className="w-full rounded-2xl px-5 py-4 text-base text-ink placeholder:text-ink-faint outline-none transition-colors"
          style={{
            background: "var(--glass)",
            border: "1px solid var(--glass-edge)",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "rgba(47,214,192,0.5)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--glass-edge)")
          }
        />

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl overflow-hidden z-50"
              style={{
                background: "var(--depth)",
                border: "1px solid var(--glass-edge)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
              }}
            >
              {results.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(s);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                    style={{
                      background:
                        i === activeIndex ? "rgba(47,214,192,0.08)" : "transparent",
                      borderBottom:
                        i < results.length - 1
                          ? "1px solid var(--glass-edge)"
                          : "none",
                    }}
                  >
                    {/* Avatar initials */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-display text-teal text-sm"
                      style={{ background: "rgba(47,214,192,0.12)" }}
                    >
                      {s.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm font-medium">{s.full_name}</p>
                      {/* Stage bar */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="h-1 w-4 rounded-full transition-colors"
                              style={{
                                background:
                                  idx < s.stage
                                    ? "var(--teal)"
                                    : "rgba(255,255,255,0.1)",
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-ink-faint font-display">
                          Stage {s.stage}/5
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && query.length >= 2 && results.length === 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 rounded-full border-2 border-teal border-t-transparent"
            />
          </div>
        )}
      </motion.div>

      {/* Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-6 text-[12px] text-ink-faint z-10"
      >
        Type at least 2 characters
      </motion.p>

      {/* Coach link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-8 right-6 z-10"
      >
        <a
          href="/coach"
          className="font-display text-[10px] tracking-[0.2em] text-ink-faint hover:text-gold transition-colors"
        >
          Coach →
        </a>
      </motion.div>

      {/* Wave-wipe transition overlay */}
      <AnimatePresence>
        {showWipe && (
          <motion.div
            key="wipe"
            initial={{ clipPath: "inset(100% 0 0 0 round 80% 0 0 80%)" }}
            animate={{ clipPath: "inset(0% 0 0 0 round 0)" }}
            transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: "rgba(47,214,192,0.10)" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
