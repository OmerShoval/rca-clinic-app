"use client";

import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, User, Waves } from "lucide-react";
import type { Student } from "@/lib/database.types";

interface StudentSelectorProps {
  clinicNumber: number;
  students: Student[];
  onSelect: (student: Student) => void;
  onBack: () => void;
}

export function StudentSelector({
  clinicNumber,
  students,
  onSelect,
  onBack,
}: StudentSelectorProps) {
  return (
    <div className="min-h-screen gradient-ocean flex flex-col px-6 py-10">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3">
          <Waves className="w-5 h-5 text-teal" strokeWidth={1.5} />
          <span className="text-teal text-sm tracking-widest uppercase font-medium">
            Clinic {clinicNumber}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Who are you?
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pick your name to open your profile
        </p>
      </motion.div>

      {/* Student list */}
      <AnimatePresence>
        {students.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 flex-1 text-muted-foreground"
          >
            <User className="w-10 h-10 opacity-30" />
            <p className="text-sm">No students in this clinic yet.</p>
            <p className="text-xs opacity-60">Ask your coach to add you.</p>
          </motion.div>
        ) : (
          <motion.div className="flex flex-col gap-3">
            {students.map((student, i) => (
              <motion.button
                key={student.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: i * 0.07,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(student)}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm px-5 py-4 text-left cursor-pointer hover:border-primary/40 hover:bg-card transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/60"
              >
                {/* Avatar circle */}
                <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <span className="text-teal font-semibold text-sm">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {student.name}
                  </p>
                  {student.key_points && student.key_points.length > 0 ? (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {student.key_points.length} key focus point
                      {student.key_points.length > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-0.5">
                      No coaching notes yet
                    </p>
                  )}
                </div>

                <ArrowLeft className="w-4 h-4 text-muted-foreground/40 rotate-180 group-hover:text-primary transition-colors flex-shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
