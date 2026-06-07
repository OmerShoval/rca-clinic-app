"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabase";
import type { Student, Session, CheckIn } from "@/lib/database.types";

interface CheckInScreenProps {
  student: Student;
  clinicNumber: number;
  dayNumber: number;
  sessionNumber: number;
  onComplete: (session: Session, checkIn: CheckIn, needsBreathing: boolean) => void;
  onBack: () => void;
}

const mentalLabels = [
  { max: 20, label: "Very Anxious", emoji: "😰" },
  { max: 40, label: "Nervous", emoji: "😟" },
  { max: 60, label: "Neutral", emoji: "😐" },
  { max: 80, label: "Focused", emoji: "😤" },
  { max: 100, label: "Fired Up", emoji: "🔥" },
];

const oceanLabels = [
  { max: 20, label: "Very Challenging", emoji: "🌊" },
  { max: 40, label: "Difficult", emoji: "💧" },
  { max: 60, label: "Manageable", emoji: "🌤️" },
  { max: 80, label: "Good", emoji: "☀️" },
  { max: 100, label: "Perfect", emoji: "✨" },
];

function getLabel(value: number, labels: typeof mentalLabels) {
  return labels.find((l) => value <= l.max) ?? labels[labels.length - 1];
}

export function CheckInScreen({
  student,
  clinicNumber,
  dayNumber,
  sessionNumber,
  onComplete,
  onBack,
}: CheckInScreenProps) {
  const [mental, setMental] = useState(65);
  const [ocean, setOcean] = useState(65);
  const [saving, setSaving] = useState(false);

  const mentalLabel = getLabel(mental, mentalLabels);
  const oceanLabel = getLabel(ocean, oceanLabels);
  const needsBreathing = mental < 45;
  const firstName = student.name.split(" ")[0];

  async function handleSubmit() {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          student_id: student.id,
          clinic_id: clinicNumber,
          day_number: dayNumber,
          session_number: sessionNumber,
          date: today,
        })
        .select()
        .single();

      if (sessionError || !sessionData) throw sessionError;

      const { data: checkInData, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          session_id: (sessionData as Session).id,
          student_id: student.id,
          emotional_state: mental,
          environmental_perception: ocean,
        })
        .select()
        .single();

      if (checkInError || !checkInData) throw checkInError;

      onComplete(sessionData as Session, checkInData as CheckIn, needsBreathing);
    } catch (err) {
      console.error("Check-in error:", err);
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen gradient-ocean flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-10 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-xs text-muted-foreground">
          Day {dayNumber} · Session {sessionNumber}
        </span>
      </div>

      <div className="flex-1 px-6 pt-6 pb-10 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Check In</h1>
          <p className="text-sm text-muted-foreground mt-1">
            How are you arriving to this session, {firstName}?
          </p>
        </div>

        {/* Mental State */}
        <div className="rounded-2xl bg-card border border-border/40 px-5 py-5 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground">Mental State</p>
              <p className="text-xs text-muted-foreground mt-0.5">How are you feeling right now?</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={mentalLabel.label}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-right"
              >
                <span className="text-2xl">{mentalLabel.emoji}</span>
                <p className={`text-xs font-medium mt-0.5 ${needsBreathing ? "text-yellow-400" : "text-teal"}`}>
                  {mentalLabel.label}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <Slider
            value={[mental]}
            onValueChange={(v) => setMental(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            min={0}
            max={100}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground/60">
            <span>Anxious</span>
            <span>Fired Up</span>
          </div>
        </div>

        {/* Ocean Read */}
        <div className="rounded-2xl bg-card border border-border/40 px-5 py-5 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground">Ocean Read</p>
              <p className="text-xs text-muted-foreground mt-0.5">How do you read the conditions?</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={oceanLabel.label}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-right"
              >
                <span className="text-2xl">{oceanLabel.emoji}</span>
                <p className="text-xs font-medium mt-0.5 text-teal">{oceanLabel.label}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <Slider
            value={[ocean]}
            onValueChange={(v) => setOcean(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            min={0}
            max={100}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground/60">
            <span>Challenging</span>
            <span>Perfect</span>
          </div>
        </div>

        {/* Breathing hint */}
        <AnimatePresence>
          {needsBreathing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3"
            >
              <p className="text-sm text-yellow-300/80">
                💛 We&apos;ll start with a short breathing exercise before your session.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-primary-foreground font-semibold glow-teal disabled:opacity-60 transition-opacity"
          >
            {saving ? "Saving..." : "Let's Surf"}
            {!saving && <ChevronRight className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
