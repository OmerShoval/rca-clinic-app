"use client";

import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronRight, Video, TrendingUp, Headphones } from "lucide-react";
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
import type { Student, Session, KeyPoint, MeditationTrack } from "@/lib/database.types";
import { PersonalMeditation } from "@/components/personal-meditation";

interface StudentCardProps {
  student: Student;
  clinicNumber: number;
  openSessions: Session[];
  onInDepth: () => void;
  onStartSession: () => void;
  onLogSession: (session: Session) => void;
  onViewProgress: () => void;
}

export function StudentCard({
  student,
  clinicNumber,
  openSessions,
  onInDepth,
  onStartSession,
  onLogSession,
  onViewProgress,
}: StudentCardProps) {
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const keyPoints    = (student.key_points    ?? []) as KeyPoint[];
  const meditations  = (student.meditations   ?? []) as MeditationTrack[];

  /* ── collect non-null video URLs in order ── */
  const videos: { label: string; url: string }[] = [
    student.vision_1st_url && { label: "Vision 1", url: student.vision_1st_url },
    student.vision_3rd_url && { label: "Vision 2", url: student.vision_3rd_url },
  ].filter(Boolean) as { label: string; url: string }[];

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
              <Badge variant="outline" className="border-primary/30 text-teal text-xs">
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
                  className="rounded-xl bg-accent/60 border border-border/40 overflow-hidden"
                >
                  <div className="flex items-start gap-3 px-3.5 py-3.5">
                    <span className="text-teal font-bold text-sm mt-0.5 flex-shrink-0 w-4">{i + 1}</span>
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground/90 leading-snug">{kp.point}</p>
                      <p className="text-xs text-primary/75 italic leading-snug">✦ {kp.feel}</p>
                    </div>
                  </div>
                  {(kp.video_1st_url || kp.video_3rd_url) && (
                    <div className="flex gap-2 px-3.5 pb-3.5">
                      {kp.video_1st_url && (
                        <div className="flex-1 rounded-lg overflow-hidden border border-border/30 bg-black">
                          <p className="text-[9px] text-muted-foreground/50 px-2 py-1 border-b border-border/20 uppercase tracking-widest">1st Person</p>
                          <video src={kp.video_1st_url} controls playsInline preload="metadata" className="w-full" style={{ height: 110, objectFit: "contain", display: "block" }} />
                        </div>
                      )}
                      {kp.video_3rd_url && (
                        <div className="flex-1 rounded-lg overflow-hidden border border-border/30 bg-black">
                          <p className="text-[9px] text-muted-foreground/50 px-2 py-1 border-b border-border/20 uppercase tracking-widest">3rd Person</p>
                          <video src={kp.video_3rd_url} controls playsInline preload="metadata" className="w-full" style={{ height: 110, objectFit: "contain", display: "block" }} />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">No coaching notes yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Your coach will update these before you surf.</p>
            </div>
          )}
        </CardContent>

        {/* ── Your Vision — videos ── */}
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-medium">
            Your Vision
          </p>

          {videos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {videos.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  className="rounded-xl overflow-hidden border border-border/40 bg-black"
                >
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
                    <Video className="w-3 h-3 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground/70">{v.label}</span>
                  </div>
                  <video
                    src={v.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full"
                    style={{ height: 200, objectFit: "contain", display: "block", background: "#000" }}
                  />
                </motion.div>
              ))}
            </div>
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

        {/* ── Personal Meditation ── */}
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-3">
            <Headphones className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Personal Meditation
            </p>
          </div>
          <PersonalMeditation tracks={meditations} />
        </CardContent>

        {/* ── Footer actions ── */}
        <CardFooter className="flex-col gap-3">
          <AnimatePresence mode="wait">
            {openSessions.length > 0 ? (
              <motion.div
                key="log-sessions"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col gap-2"
              >
                {openSessions.map((sess) => (
                  <motion.button
                    key={sess.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onLogSession(sess)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground text-sm font-semibold glow-teal transition-all"
                  >
                    Log Session {sess.session_number} — Day {sess.day_number}
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                ))}
                <button
                  onClick={onStartSession}
                  className="w-full text-center text-xs text-muted-foreground hover:text-teal transition-colors py-1"
                >
                  + Start Another Session
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="start-session"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onStartSession}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground text-sm font-semibold glow-teal transition-all"
              >
                Start Session
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

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
