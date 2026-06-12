"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { StudentForm } from "@/components/coach/student-form";
import { DebriefEditor } from "@/components/coach/debrief-editor";
import { BackHomeEditor } from "@/components/coach/back-home-editor";
import { InboxView } from "@/components/coach/inbox-view";
import type { Student, Clinic, Debrief } from "@/lib/database.types";

type Tab = "waves" | "israel" | "wave_pool";
type View = "student" | "addStudent" | "editStudent" | "inbox";

interface Props {
  students: Student[];
  clinics: Clinic[];
}

const STAGE_LABELS = ["", "Beginner", "Developing", "Intermediate", "Advanced", "Expert"];

export function CoachDashboardClient({ students: initialStudents, clinics: initialClinics }: Props) {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [clinics, setClinics] = useState<Clinic[]>(initialClinics);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [selectedDebriefId, setSelectedDebriefId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("waves");
  const [view, setView] = useState<View>("student");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [newWaveLabel, setNewWaveLabel] = useState("");
  const [addingDebrief, setAddingDebrief] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const selectedStudent = students.find((s) => s.id === selectedId) ?? null;
  const selectedDebrief = debriefs.find((d) => d.id === selectedDebriefId) ?? null;
  const isEditorVisible = !!selectedId || view === "addStudent" || view === "inbox";

  const fetchDebriefs = useCallback(async (studentId: string) => {
    setDebriefLoading(true);
    setDebriefs([]);
    setSelectedDebriefId(null);
    try {
      const res = await fetch(`/api/coach/debriefs?studentId=${studentId}`);
      const data = await res.json();
      setDebriefs(Array.isArray(data) ? data : []);
    } finally {
      setDebriefLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchDebriefs(selectedId);
  }, [selectedId, fetchDebriefs]);

  function selectStudent(id: string) {
    setSelectedId(id);
    setView("student");
    setActiveTab("waves");
    setSelectedDebriefId(null);
    setAddingDebrief(false);
  }

  function handleStudentAdded(student: Student) {
    setStudents((prev) => [...prev, student].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setSelectedId(student.id);
    setView("student");
  }

  function handleStudentUpdated(student: Student) {
    setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
    setView("student");
    setEditingStudent(null);
  }

  async function handleNewDebrief() {
    if (!selectedId || !newWaveLabel.trim()) return;
    setAddingDebrief(true);
    try {
      const res = await fetch("/api/coach/debriefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: selectedId, wave_label: newWaveLabel.trim() }),
      });
      const debrief = await res.json();
      setDebriefs((prev) => [debrief, ...prev]);
      setSelectedDebriefId(debrief.id);
      setNewWaveLabel("");
    } finally {
      setAddingDebrief(false);
    }
  }

  function handleDebriefUpdated(updated: Debrief) {
    setDebriefs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleDebriefDeleted(id: string) {
    setDebriefs((prev) => prev.filter((d) => d.id !== id));
    if (selectedDebriefId === id) setSelectedDebriefId(null);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/coach/auth", { method: "DELETE" });
    router.push("/coach");
  }

  // Group students by clinic
  const byClinic = clinics
    .map((c) => ({ clinic: c, students: students.filter((s) => s.clinic_id === c.id) }))
    .filter((g) => g.students.length > 0);
  const ungrouped = students.filter((s) => !clinics.some((c) => c.id === s.clinic_id));

  return (
    <div className="flex h-screen overflow-hidden bg-abyss">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 900px 350px at 70% -5%, rgba(224,182,79,0.04), transparent 60%)" }}
      />

      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col border-r overflow-hidden ${isEditorVisible ? "hidden md:flex md:w-72 lg:w-80" : "flex w-full md:w-72 lg:w-80"}`}
        style={{ borderColor: "var(--glass-edge)", background: "var(--depth)" }}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--glass-edge)" }}>
          <p className="font-display text-gold text-[10px] tracking-[0.3em]">Ocean Athlete</p>
          <h1 className="font-display text-ink text-2xl leading-none">Coach Dashboard</h1>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => { setView("addStudent"); setSelectedId(null); setSelectedDebriefId(null); }}
              className="flex-1 py-2 rounded-xl font-display text-[11px] tracking-widest text-gold transition-all hover:opacity-80"
              style={{ background: "var(--gold-soft)", border: "1px solid rgba(224,182,79,0.3)" }}
            >
              + Add
            </button>
            <button
              onClick={() => { setView("inbox"); setSelectedId(null); setSelectedDebriefId(null); }}
              className="flex-1 py-2 rounded-xl font-display text-[11px] tracking-widest transition-all hover:opacity-80"
              style={view === "inbox"
                ? { background: "var(--coral-soft)", color: "var(--coral)", border: "1px solid rgba(255,107,94,0.3)" }
                : { background: "var(--glass)", color: "var(--ink-faint)", border: "1px solid var(--glass-edge)" }
              }
            >
              Inbox
            </button>
            <a
              href="/"
              className="px-3 py-2 rounded-xl font-display text-[10px] tracking-widest text-ink-faint hover:text-teal transition-colors"
              style={{ border: "1px solid var(--glass-edge)" }}
            >
              ↗
            </a>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-2 rounded-xl font-display text-[10px] tracking-widest text-ink-faint hover:text-coral transition-colors"
              style={{ border: "1px solid var(--glass-edge)" }}
            >
              Out
            </button>
          </div>
        </div>

        {/* Roster */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {byClinic.map(({ clinic, students: gs }) => (
            <div key={clinic.id} className="mb-4">
              <p className="font-display text-[10px] tracking-[0.25em] text-gold px-1 mb-2">{clinic.name}</p>
              <div className="flex flex-col gap-1">
                {gs.map((s) => (
                  <RosterRow
                    key={s.id}
                    student={s}
                    selected={selectedId === s.id}
                    onSelect={() => selectStudent(s.id)}
                    onEdit={() => { setEditingStudent(s); setSelectedId(s.id); setView("editStudent"); }}
                  />
                ))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div className="mb-4">
              <p className="font-display text-[10px] tracking-[0.25em] text-ink-faint px-1 mb-2">Unassigned</p>
              <div className="flex flex-col gap-1">
                {ungrouped.map((s) => (
                  <RosterRow
                    key={s.id}
                    student={s}
                    selected={selectedId === s.id}
                    onSelect={() => selectStudent(s.id)}
                    onEdit={() => { setEditingStudent(s); setSelectedId(s.id); setView("editStudent"); }}
                  />
                ))}
              </div>
            </div>
          )}
          {students.length === 0 && (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🌊</p>
              <p className="font-display text-ink text-lg">No students yet</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main
        className={`flex flex-col overflow-hidden ${isEditorVisible ? "flex w-full md:flex-1" : "hidden md:flex md:flex-1"}`}
      >
        {/* ── Panels ── */}
        <AnimatePresence mode="wait">
          {/* Inbox */}
          {view === "inbox" && (
            <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto px-5 py-6">
              <button onClick={() => setView("student")} className="md:hidden flex items-center gap-2 font-display text-[11px] tracking-widest text-ink-faint mb-5">
                ← Roster
              </button>
              <InboxView />
            </motion.div>
          )}

          {/* Add Student */}
          {view === "addStudent" && (
            <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto px-5 py-6">
              {/* Mobile back */}
              <button onClick={() => { setView("student"); }} className="md:hidden flex items-center gap-2 font-display text-[11px] tracking-widest text-ink-faint mb-5">
                ← Roster
              </button>
              <StudentForm clinics={clinics} onSave={handleStudentAdded} onClinicAdded={(c) => setClinics((prev) => [...prev, c].sort((a, b) => a.number - b.number))} onCancel={() => setView("student")} />
            </motion.div>
          )}

          {/* Edit Student */}
          {view === "editStudent" && editingStudent && (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto px-5 py-6">
              <button onClick={() => { setView("student"); setEditingStudent(null); }} className="md:hidden flex items-center gap-2 font-display text-[11px] tracking-widest text-ink-faint mb-5">
                ← Back
              </button>
              <StudentForm
                clinics={clinics}
                student={editingStudent}
                onSave={handleStudentUpdated}
                onClinicAdded={(c) => setClinics((prev) => [...prev, c].sort((a, b) => a.number - b.number))}
                onCancel={() => { setView("student"); setEditingStudent(null); }}
              />
            </motion.div>
          )}

          {/* Student View */}
          {view === "student" && selectedStudent && (
            <motion.div key={selectedStudent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full overflow-hidden">
              {/* Student header */}
              <div className="flex-shrink-0 px-5 py-4" style={{ borderBottom: "1px solid var(--glass-edge)" }}>
                {/* Mobile back */}
                <button onClick={() => { setSelectedId(null); }} className="md:hidden flex items-center gap-1 font-display text-[11px] tracking-widest text-ink-faint mb-3">
                  ← Roster
                </button>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-display text-teal text-sm" style={{ background: "rgba(47,214,192,0.12)" }}>
                    {selectedStudent.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-xl text-ink leading-none">{selectedStudent.full_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="h-1 w-4 rounded-full" style={{ background: i < selectedStudent.stage ? "var(--teal)" : "rgba(255,255,255,0.1)" }} />
                        ))}
                      </div>
                      <span className="font-display text-[10px] text-ink-faint">{STAGE_LABELS[selectedStudent.stage]}</span>
                      {selectedStudent.focus_skill && (
                        <span className="font-display text-[10px] text-gold truncate">· {selectedStudent.focus_skill}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedStudent.whatsapp_number && (
                      <a
                        href={`https://wa.me/${selectedStudent.whatsapp_number.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-display text-[10px] tracking-widest text-teal px-2.5 py-1.5 rounded-lg"
                        style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
                      >
                        WA
                      </a>
                    )}
                    <a
                      href={`/s/${selectedStudent.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display text-[10px] tracking-widest text-gold px-2.5 py-1.5 rounded-lg"
                      style={{ border: "1px solid rgba(224,182,79,0.3)" }}
                    >
                      Preview ↗
                    </a>
                    <button
                      onClick={() => { setEditingStudent(selectedStudent); setView("editStudent"); }}
                      className="font-display text-[10px] tracking-widest text-ink-faint px-2.5 py-1.5 rounded-lg"
                      style={{ border: "1px solid var(--glass-edge)" }}
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4">
                  {(["waves", "israel", "wave_pool"] as Tab[]).map((tab) => {
                    const labels: Record<Tab, string> = { waves: "My Waves", israel: "Israel Ocean", wave_pool: "Wave Pool" };
                    return (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setSelectedDebriefId(null); }}
                        className="px-3 py-1.5 rounded-lg font-display text-[10px] tracking-widest transition-all"
                        style={activeTab === tab
                          ? { background: tab === "waves" ? "var(--teal-soft)" : "var(--gold-soft)", color: tab === "waves" ? "var(--teal)" : "var(--gold)", border: `1px solid ${tab === "waves" ? "rgba(47,214,192,0.3)" : "rgba(224,182,79,0.3)"}` }
                          : { background: "transparent", color: "var(--ink-faint)", border: "1px solid transparent" }
                        }
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {activeTab === "waves" && (
                  <WavesTab
                    student={selectedStudent}
                    debriefs={debriefs}
                    loading={debriefLoading}
                    selectedDebrief={selectedDebrief}
                    newWaveLabel={newWaveLabel}
                    addingDebrief={addingDebrief}
                    onSelectDebrief={(id) => setSelectedDebriefId(id === selectedDebriefId ? null : id)}
                    onNewLabelChange={setNewWaveLabel}
                    onCreateDebrief={handleNewDebrief}
                    onDebriefUpdated={handleDebriefUpdated}
                    onDebriefDeleted={handleDebriefDeleted}
                  />
                )}
                {activeTab === "israel" && (
                  <BackHomeEditor studentId={selectedStudent.id} studentSlug={selectedStudent.slug} environment="israel_ocean" />
                )}
                {activeTab === "wave_pool" && (
                  <BackHomeEditor studentId={selectedStudent.id} studentSlug={selectedStudent.slug} environment="wave_pool" />
                )}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {view === "student" && !selectedStudent && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl mb-4">🌊</p>
                <p className="font-display text-ink text-2xl mb-2">Select a student</p>
                <p className="text-ink-dim text-sm">Pick from the roster to open their coaching space</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Roster Row ──────────────────────────────────────────────────────────────
function RosterRow({
  student,
  selected,
  onSelect,
  onEdit,
}: {
  student: Student;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const initials = student.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group"
      style={selected
        ? { background: "rgba(47,214,192,0.08)", border: "1px solid rgba(47,214,192,0.25)" }
        : { background: "transparent", border: "1px solid transparent" }
      }
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display text-teal text-xs" style={{ background: "rgba(47,214,192,0.12)" }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink text-[13px] font-medium truncate leading-tight">{student.full_name}</p>
        <div className="flex gap-0.5 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-0.5 w-3 rounded-full" style={{ background: i < student.stage ? "var(--teal)" : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="font-display text-[9px] tracking-widest text-ink-faint hover:text-gold transition-colors"
        >
          edit
        </button>
      </div>
      <span
        className="font-display text-[8px] tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
        style={student.status === "live"
          ? { color: "var(--teal)", background: "var(--teal-soft)" }
          : { color: "var(--coral)", background: "var(--coral-soft)" }
        }
      >
        {student.status.toUpperCase()}
      </span>
    </button>
  );
}

// ── Waves Tab ────────────────────────────────────────────────────────────────
interface WavesTabProps {
  student: Student;
  debriefs: Debrief[];
  loading: boolean;
  selectedDebrief: Debrief | null;
  newWaveLabel: string;
  addingDebrief: boolean;
  onSelectDebrief: (id: string) => void;
  onNewLabelChange: (v: string) => void;
  onCreateDebrief: () => void;
  onDebriefUpdated: (d: Debrief) => void;
  onDebriefDeleted: (id: string) => void;
}

function WavesTab({
  student,
  debriefs,
  loading,
  selectedDebrief,
  newWaveLabel,
  addingDebrief,
  onSelectDebrief,
  onNewLabelChange,
  onCreateDebrief,
  onDebriefUpdated,
  onDebriefDeleted,
}: WavesTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 rounded-full border-2 border-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* New debrief form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newWaveLabel}
          onChange={(e) => onNewLabelChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onCreateDebrief(); }}
          placeholder="Wave label — e.g. Day 3 Morning"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none"
          style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
        />
        <button
          onClick={onCreateDebrief}
          disabled={addingDebrief || !newWaveLabel.trim()}
          className="px-4 py-2.5 rounded-xl font-display text-[11px] tracking-widest text-gold disabled:opacity-40 transition-all"
          style={{ background: "var(--gold-soft)", border: "1px solid rgba(224,182,79,0.3)" }}
        >
          {addingDebrief ? "…" : "+ Wave"}
        </button>
      </div>

      {/* Debrief list */}
      {debriefs.length === 0 ? (
        <div className="text-center py-10 rounded-2xl" style={{ border: "1px dashed var(--glass-edge)" }}>
          <p className="text-3xl mb-2">🏄</p>
          <p className="font-display text-ink text-lg mb-1">No waves yet</p>
          <p className="text-ink-faint text-sm">Create the first debrief above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {debriefs.map((d) => {
            const isSelected = selectedDebrief?.id === d.id;
            return (
              <div key={d.id}>
                <button
                  onClick={() => onSelectDebrief(d.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                  style={isSelected
                    ? { background: "rgba(47,214,192,0.06)", border: "1px solid rgba(47,214,192,0.25)" }
                    : { background: "var(--glass)", border: "1px solid var(--glass-edge)" }
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-medium">{d.wave_label}</p>
                    <p className="font-display text-[9px] tracking-widest text-ink-faint mt-0.5">
                      {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span
                    className="font-display text-[8px] tracking-widest px-2 py-1 rounded flex-shrink-0"
                    style={d.status === "published"
                      ? { color: "var(--teal)", background: "var(--teal-soft)" }
                      : { color: "var(--ink-faint)", background: "var(--glass)" }
                    }
                  >
                    {d.status.toUpperCase()}
                  </span>
                  <span className="text-ink-faint text-xs flex-shrink-0" style={{ transform: isSelected ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </button>

                {/* Inline editor */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-4 pt-4 pb-2 rounded-b-2xl mt-0.5" style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)", borderTop: "none" }}>
                        <DebriefEditor
                          debrief={d}
                          student={student}
                          onUpdated={onDebriefUpdated}
                          onDelete={onDebriefDeleted}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
