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
import type { Student } from "@/lib/database.types";

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

  const keyPoints = student.key_points ?? [];

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Card interactive className="w-full">
        {/* ── Header ── */}
        <CardHeader>
          <div className="flex items-start gap-3">
            {/* Avatar */}
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
              <CardDescription>Clinic {clinicNumber}</CardDescription>
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

        {/* ── 3 Key Focus Points ── */}
        <CardContent>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-medium">
            Your 3 Focus Points
          </p>

          {keyPoints.length > 0 ? (
            <div className="flex flex-col gap-2">
              {keyPoints.slice(0, 3).map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex items-start gap-3 rounded-xl bg-accent/60 border border-border/40 px-3.5 py-3"
                >
                  <span className="text-teal font-bold text-sm mt-0.5 flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground/90 leading-snug">
                    {point}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">
                No coaching notes yet.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Your coach will update these before you surf.
              </p>
            </div>
          )}
        </CardContent>

        {/* ── Vision Videos ── */}
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-medium">
            Your Vision
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* 1st Person */}
            <VisionVideoTile
              label="1st Person"
              subtitle="Inside your body"
              url={student.vision_1st_url}
              isActive={activeVideo === "1st"}
              onToggle={() =>
                setActiveVideo((v) => (v === "1st" ? null : "1st"))
              }
            />
            {/* 3rd Person */}
            <VisionVideoTile
              label="3rd Person"
              subtitle="Watching yourself"
              url={student.vision_3rd_url}
              isActive={activeVideo === "3rd"}
              onToggle={() =>
                setActiveVideo((v) => (v === "3rd" ? null : "3rd"))
              }
            />
          </div>

          {/* Inline video player */}
          {activeVideo && (
            <motion.div
              key={activeVideo}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 overflow-hidden rounded-xl border border-border/50"
            >
              <video
                src={
                  activeVideo === "1st"
                    ? (student.vision_1st_url ?? "")
                    : (student.vision_3rd_url ?? "")
                }
                controls
                autoPlay
                playsInline
                className="w-full aspect-video bg-black rounded-xl"
              />
            </motion.div>
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

/* ── Vision video tile ── */
function VisionVideoTile({
  label,
  subtitle,
  url,
  isActive,
  onToggle,
}: {
  label: string;
  subtitle: string;
  url: string | null;
  isActive: boolean;
  onToggle: () => void;
}) {
  const hasVideo = Boolean(url);

  return (
    <button
      onClick={hasVideo ? onToggle : undefined}
      disabled={!hasVideo}
      className={[
        "group flex flex-col items-center justify-center gap-1.5 rounded-xl border py-4 px-2 text-center transition-all duration-300",
        hasVideo
          ? "border-border/60 bg-accent/40 hover:border-primary/40 hover:bg-accent/70 cursor-pointer"
          : "border-dashed border-border/30 bg-transparent opacity-50 cursor-default",
        isActive ? "border-primary/50 bg-primary/10" : "",
      ].join(" ")}
    >
      <div
        className={[
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          hasVideo ? "bg-primary/15" : "bg-muted/30",
          isActive ? "bg-primary/25" : "",
        ].join(" ")}
      >
        {hasVideo ? (
          <Play
            className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-teal"}`}
            fill="currentColor"
          />
        ) : (
          <Video className="w-3.5 h-3.5 text-muted-foreground/40" />
        )}
      </div>
      <p className="text-xs font-medium text-foreground/80">{label}</p>
      <p className="text-[10px] text-muted-foreground/60 leading-tight">
        {hasVideo ? subtitle : "Not uploaded"}
      </p>
    </button>
  );
}
