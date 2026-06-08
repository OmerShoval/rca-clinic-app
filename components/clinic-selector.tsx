"use client";

import { motion } from "motion/react";

const CLINICS = [1, 2, 3, 4, 5, 6];

interface ClinicSelectorProps {
  onSelect: (clinicNumber: number) => void;
}

export function ClinicSelector({ onSelect }: ClinicSelectorProps) {
  return (
    <div className="min-h-screen gradient-ocean flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-12"
      >
        {/* Logo area */}
        <div className="flex items-center justify-center mb-5">
          <OceanAthleteLogo />
        </div>

        <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
          Which clinic
          <br />
          are you in?
        </h1>
        <p className="text-muted-foreground text-sm">
          Select your clinic to get started
        </p>
      </motion.div>

      {/* Clinic grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid grid-cols-2 gap-4 w-full max-w-sm"
      >
        {CLINICS.map((num, i) => (
          <motion.button
            key={num}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.1 + i * 0.07,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(num)}
            className="relative group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm py-7 px-4 cursor-pointer transition-colors duration-300 hover:border-primary/40 hover:bg-card glow-teal-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
            <span className="text-4xl font-bold text-teal">{num}</span>
            <span className="text-xs text-muted-foreground tracking-wide">
              Clinic {num}
            </span>
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 text-muted-foreground/30 text-xs tracking-widest"
      >
        Coach Omer · Ocean Athlete
      </motion.div>
    </div>
  );
}

/* ── Logo — swap src once logo file is provided ── */
function OceanAthleteLogo() {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Placeholder logo mark — replace with <img src="/logo.png" /> once uploaded */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-90"
      >
        <circle cx="28" cy="28" r="27" stroke="oklch(0.68 0.14 188)" strokeWidth="1.2" strokeOpacity="0.35" />
        {/* Wave lines */}
        <path
          d="M10 30 Q16 24 22 30 Q28 36 34 30 Q40 24 46 30"
          stroke="oklch(0.68 0.14 188)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          strokeOpacity="0.9"
        />
        <path
          d="M10 35 Q16 29 22 35 Q28 41 34 35 Q40 29 46 35"
          stroke="oklch(0.68 0.14 188)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          strokeOpacity="0.45"
        />
        {/* Surfboard silhouette */}
        <ellipse cx="28" cy="21" rx="4" ry="9" stroke="oklch(0.68 0.14 188)" strokeWidth="1.4" fill="oklch(0.68 0.14 188 / 12%)" strokeOpacity="0.8" />
      </svg>

      <div className="text-center">
        <p className="text-teal font-bold tracking-[0.18em] text-sm uppercase leading-none">
          Ocean Athlete
        </p>
        <p className="text-muted-foreground/50 text-[10px] tracking-widest mt-0.5">
          by Coach Omer
        </p>
      </div>
    </div>
  );
}
