"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Play, BookOpen, ChevronRight, Video, TrendingUp } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Student, KeyPoint } from "@/lib/database.types";

interface StudentCardProps {
  student: Student;
  clinicNumber: number;
  onInDepth: () => void;
  onStartSession: () => void;
  onViewProgress: () => void;
}

export function StudentCard({
  student,
  clinicNumber,
  onInDepth,
  onStartSession,
  onViewProgress,
}: StudentCardProps) {
  const [activeVideo, setActiveVideo] = useState<"1st" | "3rd" | null>(null);

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const keyPoints = (student.key_points ?? []) as KeyPoint[];

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Card interactive className="w-full">
        {/* ── Header ── */}
        <CardHeader>
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-12 h-12 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0"
            >
              <span className="text-teal font-bold text-base">{initials}</span>
            </motion.div>

            <div className="flex-1 min-w-0">
              <CardTitle>{student.name}</CardTitle>
              <CardDescription>Clinic {clinicNumber} · Ocean Athlete</CardDescription>
            </div>

            <CardAction>
              <Badge
                variant="outline"
                className="border-primary/30 text-teal text-xs"
              >
                🌊 Active
              </Badge>
            </CardAction>
          </div>
        </CardHeader>

        {/* ── 3 Focus Points ── */}
        <CardContent>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-medium">
            Your 3 Focus Points
          </p>

          {keyPoints.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {keyPoints.slice(0, 3).map((kp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex items-start gap-3 rounded-xl bg-accent/60 border border-border/40 px-3.5 py-3.5"
                >
                  <span className="text-teal font-bold text-sm mt-0.5 flex-shrink-0 w-4">
                    {i + 1}
                  </span>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-sm font-semibold text-foreground/90 leading-snug">
                      {kp.point}
                    </p>
                    <p className="text-xs text-primary/75 italic leading-snug">
                      ✦ {kp.feel}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">No coaching notes yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Your coach will update these before you surf.
              </p>
            </div>
          )}
        </CardContent>

        {/* ── Vision Video ── */}
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-medium">
            Your Vision
          </p>

          {student.vision_1st_url || student.vision_3rd_url ? (
            <>
              <button
                onClick={() => setActiveVideo((v) => (v ? null : "1st"))}
                className={[
                  "w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-all duration-300",
                  activeVideo
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 bg-accent/40 hover:border-primary/40 hover:bg-accent/70",
                ].join(" ")}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${activeVideo ? "bg-primary/25" : "bg-primary/15"}`}>
                  <Play className={`w-3.5 h-3.5 ${activeVideo ? "text-primary" : "text-teal"}`} fill="currentColor" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground/85">Vision Video</p>
                  <p className="text-xs text-muted-foreground/60">{activeVideo ? "Tap to close" : "Tap to play"}</p>
                </div>
              </button>

              {activeVideo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-3 overflow-hidden rounded-xl border border-border/50"
                >
                  <video
                    src={student.vision_1st_url ?? student.vision_3rd_url ?? ""}
                    controls
                    autoPlay
                    playsInline
                    className="w-full aspect-video bg-black rounded-xl"
                  />
                </motion.div>
              )}
            </>
          ) : (
            <div className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border/30 px-4 py-3.5 opacity-50">
              <div className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center">
                <Video className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/50">Vision Video</p>
                <p className="text-xs text-muted-foreground/40">Not uploaded yet</p>
              </div>
            </div>
          )}
        </CardContent>

        {/* ── Footer actions ── */}
        <CardFooter className="flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartSession}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground text-sm font-semibold glow-teal transition-all"
          >
            Start Session
            <ChevronRight className="w-4 h-4" />
          </motion.button>

          <div className="w-full flex items-center justify-between">
            <button
              onClick={onInDepth}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              In-Depth
            </button>
            <button
              onClick={onViewProgress}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              My Progress
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
