"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ClinicSelector } from "@/components/clinic-selector";
import { StudentSelector } from "@/components/student-selector";
import { StudentCard } from "@/components/student-card";
import { InDepthView } from "@/components/in-depth-view";
import { DaySessionPicker } from "@/components/day-session-picker";
import { CheckInScreen } from "@/components/check-in-screen";
import { BreathingExercise } from "@/components/breathing-exercise";
import { WaveSession } from "@/components/wave-session";
import { ProgressAnalytics } from "@/components/progress-analytics";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase";
import type { Student, Session, CheckIn } from "@/lib/database.types";

type Screen =
  | "clinic"
  | "student"
  | "dashboard"
  | "indepth"
  | "daypicker"
  | "checkin"
  | "breathing"
  | "session"
  | "analytics";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("clinic");
  const [clinicNumber, setClinicNumber] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  const [dayNumber, setDayNumber] = useState(1);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  /* ── Open sessions (pre-done, post-not-yet-logged) ── */
  const [openSessions, setOpenSessions] = useState<Session[]>([]);

  const loadOpenSessions = useCallback(async (studentId: string) => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", today)
      .order("session_number");

    if (!sessions?.length) {
      setOpenSessions([]);
      return;
    }

    const { data: stats } = await supabase
      .from("daily_stats")
      .select("session_id")
      .in("session_id", sessions.map((s) => (s as Session).id));

    const closedIds = new Set((stats ?? []).map((s) => (s as { session_id: string }).session_id));
    setOpenSessions((sessions as Session[]).filter((s) => !closedIds.has(s.id)));
  }, []);

  async function handleClinicSelect(num: number) {
    setLoading(true);
    setClinicNumber(num);

    const { data: clinicRow } = await supabase
      .from("clinics")
      .select("*")
      .eq("number", num)
      .single();

    const clinic = clinicRow as { id: number } | null;

    if (clinic) {
      const { data: studentList } = await supabase
        .from("students")
        .select("*")
        .eq("clinic_id", clinic.id)
        .order("name");
      setStudents(studentList ?? []);
    }

    setLoading(false);
    setScreen("student");
  }

  async function handleStudentSelect(student: Student) {
    setActiveStudent(student);
    await loadOpenSessions(student.id);
    setScreen("dashboard");
  }

  /* ── After check-in: go back to dashboard ── */
  function handleCheckInComplete(sess: Session, _ci: CheckIn, needsBreathing: boolean) {
    setActiveSession(sess);
    setScreen(needsBreathing ? "breathing" : "dashboard");
    if (!needsBreathing && activeStudent) loadOpenSessions(activeStudent.id);
  }

  /* ── After breathing: back to dashboard ── */
  function handleBreathingComplete() {
    setScreen("dashboard");
    if (activeStudent) loadOpenSessions(activeStudent.id);
  }

  /* ── Student taps "Log Session N" ── */
  function handleLogSession(session: Session) {
    setActiveSession(session);
    setScreen("session");
  }

  /* ── After wave session ends ── */
  function handleSessionEnd() {
    if (activeStudent) loadOpenSessions(activeStudent.id);
    setScreen("analytics");
  }

  const slide = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {screen === "clinic" && (
          <motion.div key="clinic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <ClinicSelector onSelect={handleClinicSelect} />
          </motion.div>
        )}

        {screen === "student" && (
          <motion.div key="student" {...slide}>
            {loading ? (
              <LoadingScreen />
            ) : (
              <StudentSelector
                clinicNumber={clinicNumber!}
                students={students}
                onSelect={handleStudentSelect}
                onBack={() => { setScreen("clinic"); setStudents([]); }}
              />
            )}
          </motion.div>
        )}

        {screen === "dashboard" && activeStudent && (
          <motion.div key="dashboard" {...slide} className="min-h-screen gradient-ocean flex flex-col py-10">
            <div className="flex items-center justify-between px-6 mb-8">
              <button
                onClick={() => setScreen("student")}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground tracking-widest uppercase">
                  Clinic {clinicNumber}
                </span>
                <ThemeToggle />
              </div>
            </div>
            <StudentCard
              student={activeStudent}
              clinicNumber={clinicNumber!}
              openSessions={openSessions}
              onInDepth={() => setScreen("indepth")}
              onStartSession={() => setScreen("daypicker")}
              onLogSession={handleLogSession}
              onViewProgress={() => setScreen("analytics")}
            />
          </motion.div>
        )}

        {screen === "indepth" && activeStudent && (
          <motion.div key="indepth" {...slide}>
            <InDepthView
              student={activeStudent}
              clinicNumber={clinicNumber!}
              onBack={() => setScreen("dashboard")}
            />
          </motion.div>
        )}

        {screen === "daypicker" && (
          <motion.div key="daypicker" {...slide}>
            <DaySessionPicker
              onConfirm={(day, sess) => {
                setDayNumber(day);
                setSessionNumber(sess);
                setScreen("checkin");
              }}
              onBack={() => setScreen("dashboard")}
            />
          </motion.div>
        )}

        {screen === "checkin" && activeStudent && (
          <motion.div key="checkin" {...slide}>
            <CheckInScreen
              student={activeStudent}
              clinicNumber={clinicNumber!}
              dayNumber={dayNumber}
              sessionNumber={sessionNumber}
              onComplete={handleCheckInComplete}
              onBack={() => setScreen("daypicker")}
            />
          </motion.div>
        )}

        {screen === "breathing" && (
          <motion.div key="breathing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <BreathingExercise onComplete={handleBreathingComplete} />
          </motion.div>
        )}

        {screen === "session" && activeStudent && activeSession && (
          <motion.div key="session" {...slide}>
            <WaveSession
              student={activeStudent}
              session={activeSession}
              onEndSession={handleSessionEnd}
            />
          </motion.div>
        )}

        {screen === "analytics" && activeStudent && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProgressAnalytics
              student={activeStudent}
              onBack={() => setScreen("dashboard")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen gradient-ocean flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="text-teal text-sm tracking-widest"
      >
        🌊 Loading...
      </motion.div>
    </div>
  );
}
