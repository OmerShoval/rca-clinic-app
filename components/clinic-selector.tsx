"use client";

import { motion } from "motion/react";
import { Waves } from "lucide-react";

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
        <div className="flex items-center justify-center gap-3 mb-4">
          <Waves className="w-8 h-8 text-teal" strokeWidth={1.5} />
          <span className="text-teal font-medium tracking-widest text-sm uppercase">
            RCA Surf Clinic
          </span>
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
            {/* subtle top shimmer line */}
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

            <span className="text-4xl font-bold text-teal">{num}</span>
            <span className="text-xs text-muted-foreground tracking-wide">
              Clinic {num}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Footer wave */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 text-muted-foreground/30 text-xs tracking-widest"
      >
        🌊 Coach Omer
      </motion.div>
    </div>
  );
}
