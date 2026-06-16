"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

// ─── Illustrations ────────────────────────────────────────────────────────────

const WaveArt = (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="78" cy="22" r="18" fill="rgba(255,255,255,0.07)" />
    <circle cx="78" cy="22" r="10" fill="rgba(255,255,255,0.07)" />
    <path
      d="M-10 60 Q22 38 55 60 Q88 82 120 60"
      stroke="rgba(255,255,255,0.13)"
      strokeWidth="7"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M-10 74 Q22 52 55 74 Q88 96 120 74"
      stroke="rgba(255,255,255,0.07)"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M-10 86 Q22 64 55 86 Q88 108 120 86"
      stroke="rgba(255,255,255,0.04)"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const PlanArt = (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="48" r="30" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)" />
    <circle cx="50" cy="48" r="18" fill="rgba(255,255,255,0.06)" />
    <circle cx="50" cy="48" r="7" fill="rgba(255,255,255,0.1)" />
    <line x1="50" y1="12" x2="50" y2="24" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="82" y1="48" x2="94" y2="48" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="6"  y1="48" x2="18" y2="48" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="50" y1="72" x2="50" y2="84" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// ─── Palettes ─────────────────────────────────────────────────────────────────

export const BOOK_PALETTES = [
  {
    top:    "linear-gradient(150deg, #0c3028 0%, #1e5540 50%, #0c3028 100%)",
    accent: "#2fd6c0",
    art:    WaveArt,
  },
  {
    top:    "linear-gradient(150deg, #2d1b00 0%, #5e3a00 50%, #2d1b00 100%)",
    accent: "#e0b64f",
    art:    PlanArt,
  },
  {
    top:    "linear-gradient(150deg, #2e0d0a 0%, #5e1c14 50%, #2e0d0a 100%)",
    accent: "#ff6b5e",
    art:    WaveArt,
  },
  {
    top:    "linear-gradient(150deg, #0a1b30 0%, #1b3d6a 50%, #0a1b30 100%)",
    accent: "#6baed6",
    art:    WaveArt,
  },
  {
    top:    "linear-gradient(150deg, #1c0a2e 0%, #3d1668 50%, #1c0a2e 100%)",
    accent: "#b077d4",
    art:    PlanArt,
  },
  {
    top:    "linear-gradient(150deg, #0a2e10 0%, #185828 50%, #0a2e10 100%)",
    accent: "#4ecb71",
    art:    WaveArt,
  },
];

export const BOOK_HEIGHTS = [124, 138, 118, 150, 132, 142];

// ─── Book ─────────────────────────────────────────────────────────────────────

interface BookProps {
  href: string;
  title: string;
  footer?: string;
  colorIndex: number;
  bookIndex: number;
  delay: number;
  coverImageUrl?: string | null;
  tag?: string | null;
}

const W = 88; // book width px

export function Book({ href, title, footer, colorIndex, bookIndex, delay, coverImageUrl, tag }: BookProps) {
  const reduce  = useReducedMotion();
  const pal     = BOOK_PALETTES[colorIndex % BOOK_PALETTES.length];
  const height  = BOOK_HEIGHTS[bookIndex % BOOK_HEIGHTS.length];

  return (
    <motion.div
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: -32, rotate: ((bookIndex % 3) - 1) * 14 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      style={{ height, alignSelf: "flex-end", flexShrink: 0, perspective: 900 }}
    >
      <Link href={href} className="block h-full" style={{ width: W }}>
        {/* 3-D wrapper — rotates on hover to reveal spine */}
        <motion.div
          whileHover={reduce ? {} : { rotateY: -22, transition: { type: "spring", stiffness: 220, damping: 20 } }}
          whileTap={{ scale: 0.93, transition: { type: "spring", stiffness: 480, damping: 22 } }}
          className="relative w-fit [container-type:inline-size]"
          style={{ transformStyle: "preserve-3d", minWidth: W, height: "100%" }}
        >

          {/* ── FRONT COVER ───────────────────────────────────────────────────── */}
          <div
            className="flex flex-col h-full rounded-l-[3px] rounded-r-[2px] overflow-hidden shadow-book relative select-none"
            style={{ width: W }}
          >
            {/* Top — colored art / photo section */}
            <div className="flex-1 relative overflow-hidden" style={{ background: coverImageUrl ? "#0a0a0a" : pal.top }}>
              {coverImageUrl ? (
                /* Photo cover */
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${coverImageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  {/* Subtle dark gradient so title stays readable */}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.45) 100%)" }}
                  />
                </>
              ) : (
                /* SVG illustration */
                <div className="absolute inset-0">{pal.art}</div>
              )}

              {/* Tag pill — bottom-left of photo/art */}
              {tag && (
                <div
                  className="absolute bottom-1.5 left-2 font-display"
                  style={{
                    fontSize: 6,
                    letterSpacing: "0.18em",
                    color: coverImageUrl ? "rgba(255,255,255,0.85)" : pal.accent,
                    background: coverImageUrl ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.35)",
                    padding: "2px 5px",
                    borderRadius: 3,
                    maxWidth: "90%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase",
                  }}
                >
                  {tag}
                </div>
              )}

              {/* Binding strip */}
              <div
                className="absolute top-0 left-0 bottom-0 mix-blend-overlay"
                style={{ width: "8.2%", background: "var(--book-bind)" }}
              />
            </div>

            {/* Bottom — title section */}
            <div className="flex-1 relative bg-book-gradient">
              {/* Binding strip */}
              <div
                className="absolute top-0 left-0 bottom-0 opacity-20"
                style={{ width: "8.2%", background: "var(--book-bind)" }}
              />

              {/* Text content */}
              <div
                className="flex flex-col justify-between h-full [container-type:inline-size]"
                style={{ padding: "7% 6% 7% 15%" }}
              >
                {/* Title */}
                <span
                  className="font-display text-balance"
                  style={{
                    fontSize: "12.5cqw",
                    color: "var(--ink)",
                    letterSpacing: "0.03em",
                    lineHeight: 1.2,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}
                >
                  {title}
                </span>

                {/* Footer (date or label) or brand triangle */}
                {footer ? (
                  <span
                    className="font-display"
                    style={{
                      fontSize: "8.5cqw",
                      color: pal.accent,
                      letterSpacing: "0.1em",
                      opacity: 0.9,
                    }}
                  >
                    {footer}
                  </span>
                ) : (
                  <svg
                    viewBox="0 0 21 21"
                    style={{
                      width: "17cqw",
                      height: "17cqw",
                      fill: pal.accent,
                      opacity: 0.55,
                      marginLeft: -1,
                    } as React.CSSProperties}
                  >
                    <path d="M21,21H3L12,3Z" />
                  </svg>
                )}
              </div>

              {/* Accent hairline at bottom */}
              <div
                className="absolute bottom-0 right-0"
                style={{ left: "8.2%", height: 1.5, background: pal.accent, opacity: 0.35 }}
              />
            </div>

            {/* Inset border overlay */}
            <div
              className="absolute inset-0 rounded-l-[3px] rounded-r-[2px] pointer-events-none"
              style={{
                boxShadow:
                  "inset 0 0 0 1px rgba(255,255,255,0.09), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}
            />
          </div>

          {/* ── SPINE (3-D pages) ─────────────────────────────────────────────── */}
          <div
            className="absolute top-[3px]"
            style={{
              height: "calc(100% - 6px)",
              width: "29cqw",
              background:
                "linear-gradient(90deg, #0e0e0e 0%, #2c2c2c 40%, #161616 100%)",
              transform:
                `translateX(calc(${W} * 1px - 29cqw / 2 - 3px)) rotateY(90deg) translateX(calc(29cqw / 2))`,
            }}
          />

          {/* ── BACK COVER ────────────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 rounded-l-[3px] rounded-r-[2px]"
            style={{
              width: W,
              background: "#08141e",
              transform: "translateZ(calc(-1 * 29cqw))",
            }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}
