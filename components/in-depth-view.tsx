"use client";

import { motion } from "motion/react";
import { ArrowLeft, Target } from "lucide-react";
import type { Student } from "@/lib/database.types";

interface InDepthViewProps {
  student: Student;
  clinicNumber: number;
  onBack: () => void;
}

export function InDepthView({ student, clinicNumber, onBack }: InDepthViewProps) {
  const keyPoints = student.key_points ?? [];
  const sections = parseMdContent(student.md_content ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen gradient-ocean flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-10 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-xs text-muted-foreground tracking-widest uppercase">
          Clinic {clinicNumber}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">In-Depth Coaching Profile</p>
        </div>

        {keyPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-teal" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                Your 3 Focus Points
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {keyPoints.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="rounded-2xl bg-primary/8 border border-primary/20 px-4 py-3.5"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-teal font-bold text-lg leading-none mt-0.5">{i + 1}</span>
                    <p className="text-sm font-medium text-foreground leading-snug">{point}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            className="rounded-2xl bg-card border border-border/40 px-4 py-4"
          >
            <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2.5">
              {section.title}
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {section.body}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function parseMdContent(md: string): { title: string; body: string }[] {
  if (!md) return [];
  const sections: { title: string; body: string }[] = [];
  const parts = md.split(/^## /m).slice(1);
  for (const part of parts) {
    const lines = part.trim().split("\n");
    const title = lines[0].trim();
    const body = lines
      .slice(1)
      .join("\n")
      .trim()
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/^#{1,3} .*/gm, "")
      .trim();
    if (title && body) sections.push({ title, body });
  }
  return sections;
}
