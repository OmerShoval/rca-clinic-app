-- ============================================================
-- Ocean Athlete v2 — additive migration for the design canvas
-- Schema: rca.   ADDITIVE ONLY — no DROP, no destructive ALTER.
-- Ground rule 1 of SPRINT.md: rca holds real athlete data.
-- Convention matched from v1: RLS enabled + one allow-all policy;
-- real scoping is enforced in the API route layer with the
-- service-role key. Never touch the `public` schema.
-- ============================================================


-- ── 1. READING STATE ────────────────────────────────────────
-- Backs {{pctW}}, {{pageLabel}}, {{timeLabel}}, {{tocPct}}, the library
-- "Resume ▸" card, and the TOC's ✓ / read-unread ticks.
--   • no row at all            -> unread  -> drives the red "new chapter" dot
--   • row with completed=false -> in progress
--   • completed=true           -> ✓ in the TOC
CREATE TABLE IF NOT EXISTS rca.reading_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES rca.students(id) ON DELETE CASCADE,
  debrief_id      uuid NOT NULL REFERENCES rca.debriefs(id) ON DELETE CASCADE,
  pct             numeric(5,4) NOT NULL DEFAULT 0 CHECK (pct >= 0 AND pct <= 1),
  scroll_top      int4,                       -- exact resume position in px
  completed       bool NOT NULL DEFAULT false,
  first_opened_at timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reading_progress_student_debrief_key UNIQUE (student_id, debrief_id)
);
CREATE INDEX IF NOT EXISTS reading_progress_student_updated_idx
  ON rca.reading_progress (student_id, updated_at DESC);


-- ── 2. BOOKMARKS & HIGHLIGHTS ───────────────────────────────
-- Backs the reader's pennant toggle and the TOC "Bookmarks & highlights"
-- section. block_id NULL = a chapter-level bookmark (the pennant).
-- char_start/char_end anchor a highlight inside debrief_blocks.body.
CREATE TABLE IF NOT EXISTS rca.bookmarks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES rca.students(id) ON DELETE CASCADE,
  debrief_id  uuid NOT NULL REFERENCES rca.debriefs(id) ON DELETE CASCADE,
  block_id    uuid REFERENCES rca.debrief_blocks(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'bookmark'
              CHECK (kind IN ('bookmark','highlight')),
  quote       text,                            -- denormalised so the TOC row
                                               -- survives a block edit
  char_start  int4,
  char_end    int4,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookmarks_student_debrief_idx
  ON rca.bookmarks (student_id, debrief_id);
-- one pennant per chapter per student; highlights are unlimited
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_one_pennant_per_chapter
  ON rca.bookmarks (student_id, debrief_id)
  WHERE kind = 'bookmark' AND block_id IS NULL;


-- ── 3. PRIVATE STUDENT NOTES ────────────────────────────────
-- "MY NOTES · ONLY YOU SEE THIS".
-- NOTE: v1 already ships this UI in components/student/debrief-detail-client.tsx
-- (NotesSection) but stores it in localStorage under `oa_notes_<debriefId>`.
-- That data is device-bound and CANNOT be backfilled server-side — on first
-- run of the v2 reader, read the localStorage key client-side and POST it once.
CREATE TABLE IF NOT EXISTS rca.student_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rca.students(id) ON DELETE CASCADE,
  debrief_id uuid NOT NULL REFERENCES rca.debriefs(id) ON DELETE CASCADE,
  body       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_notes_student_debrief_key UNIQUE (student_id, debrief_id)
);


-- ── 4. NEXT-STEP DRILLS + PER-STUDENT COMPLETION ────────────
-- The design shows three independently checkable drills and {{drCount}}
-- "0 of 3 done". Today debrief_blocks.type='next_step' is ONE body text
-- field. habit_logs cannot carry this: it is date-keyed, not debrief-keyed.
CREATE TABLE IF NOT EXISTS rca.debrief_drills (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debrief_id uuid NOT NULL REFERENCES rca.debriefs(id) ON DELETE CASCADE,
  block_id   uuid REFERENCES rca.debrief_blocks(id) ON DELETE CASCADE,
  sort       int4 NOT NULL DEFAULT 0,
  label      text NOT NULL,
  video_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS debrief_drills_debrief_sort_idx
  ON rca.debrief_drills (debrief_id, sort);

CREATE TABLE IF NOT EXISTS rca.debrief_drill_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rca.students(id) ON DELETE CASCADE,
  drill_id   uuid NOT NULL REFERENCES rca.debrief_drills(id) ON DELETE CASCADE,
  done_at    timestamptz,                      -- NULL = unchecked
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT debrief_drill_logs_student_drill_key UNIQUE (student_id, drill_id)
);


-- ── 5. NAMED VIDEO MARKERS ──────────────────────────────────
-- The reader needs THREE named markers on ONE film ("0:12 Wave 2",
-- "0:47 Bottom turn", "1:24 Best wave") plus prose chips that scrub to them.
-- debrief_blocks.timestamp_marker is a single free-text string on a BLOCK,
-- not a marker list on a VIDEO.
CREATE TABLE IF NOT EXISTS rca.video_markers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   uuid NOT NULL REFERENCES rca.student_videos(id) ON DELETE CASCADE,
  t_seconds  numeric(8,2) NOT NULL CHECK (t_seconds >= 0),
  label      text NOT NULL,
  sort       int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS video_markers_video_sort_idx
  ON rca.video_markers (video_id, sort);

-- Today debriefs.session_video_url is a raw URL string with no student_videos
-- row behind it, so there is nothing to hang markers on. Add the FK; keep the
-- URL column for backwards compatibility and read it as the fallback.
ALTER TABLE rca.debriefs
  ADD COLUMN IF NOT EXISTS session_video_id uuid REFERENCES rca.student_videos(id);
CREATE INDEX IF NOT EXISTS debriefs_session_video_idx
  ON rca.debriefs (session_video_id);


-- ── 6. RICH BLOCK CONTENT the reader renders and v1 cannot store ──
ALTER TABLE rca.debrief_blocks
  -- BEFORE/AFTER captions under the 2-up pair ("BEFORE · THIS MORNING")
  ADD COLUMN IF NOT EXISTS caption_primary   text,
  ADD COLUMN IF NOT EXISTS caption_secondary text,
  -- "Fig. 3.1 — Wave 7: the timing you're keeping."
  ADD COLUMN IF NOT EXISTS figure_caption    text,
  -- on-image pins + connector + callout chips on the annotated still:
  -- [{"x":0.34,"y":0.38,"color":"cor","label":"hips open early ✓"}, …]
  ADD COLUMN IF NOT EXISTS annotations       jsonb,
  -- inline highlight ranges inside body: [{"start":26,"len":52,"tone":"err"}]
  ADD COLUMN IF NOT EXISTS body_marks        jsonb,
  -- the goal card's "BY DAY 6" kicker
  ADD COLUMN IF NOT EXISTS deadline_label    text;


-- ── 7. CHAPTER IDENTITY ─────────────────────────────────────
ALTER TABLE rca.debriefs
  -- "PUBLISHED BY OMER". rca.people exists but debriefs has no author FK.
  ADD COLUMN IF NOT EXISTS author_person_id uuid REFERENCES rca.people(id),
  -- "FM · How to read this book" is a front-matter chapter, not a session
  ADD COLUMN IF NOT EXISTS chapter_kind     text NOT NULL DEFAULT 'session'
                           CHECK (chapter_kind IN ('session','front_matter')),
  -- explicit ordering; today the app derives the index from created_at DESC
  -- in app/s/[slug]/waves/[debriefId]/page.tsx, which reorders on backfill
  ADD COLUMN IF NOT EXISTS chapter_number   int4;


-- ── 8. VOLUME (CLINIC) IDENTITY ─────────────────────────────
-- Per-volume accent colour: today cover_color_index lives on DEBRIEFS,
-- so a clinic has no colour of its own. Also "Day 9 of 21" needs a length.
ALTER TABLE rca.clinics
  ADD COLUMN IF NOT EXISTS accent_color       text,     -- '#2FD6C0' | '#E0B64F' | '#6BAED6'
  ADD COLUMN IF NOT EXISTS cover_color_index  int2,
  ADD COLUMN IF NOT EXISTS total_days         int4,
  ADD COLUMN IF NOT EXISTS volume_label       text;     -- 'Vol. III'


-- ── 9. STUDENT-LEVEL v2 FIELDS ──────────────────────────────
ALTER TABLE rca.students
  -- reader theme (paper|light|abyss) + font-size index 0..3, so preferences
  -- follow the athlete across devices instead of dying in localStorage
  ADD COLUMN IF NOT EXISTS reader_prefs jsonb,
  -- the Coach Desk athlete sheet's "COACH NOTE" psych profile
  ADD COLUMN IF NOT EXISTS coach_note   text;

-- students.person_id ALREADY EXISTS but has zero references in app code and is
-- absent from lib/database.types.ts. The cross-volume Vault shelf depends on it
-- entirely: one person has one students row per clinic.
CREATE INDEX IF NOT EXISTS students_person_idx ON rca.students (person_id);


-- ── 10. HABIT IDENTITY (the silent data bug) ────────────────
-- habit_logs.completed_habits is a text[] of habit LABELS. Renaming a habit in
-- students.training_program orphans every prior log and the "71% · 5-DAY STREAK"
-- number quietly lies. Write BOTH arrays during the transition, then read ids.
ALTER TABLE rca.habit_logs
  ADD COLUMN IF NOT EXISTS completed_habit_ids text[] NOT NULL DEFAULT '{}';


-- ── 11. ASK: CHAPTER CONTEXT + THE RED DOT ──────────────────
-- The reader's Ask sheet opens prefilled with "RE: CH.3 · THE CORRECTION".
-- threads.step_ref is free text; there is no FK and no read receipt, so the
-- library's red Ask dot has nothing to switch on.
ALTER TABLE rca.threads
  ADD COLUMN IF NOT EXISTS debrief_id      uuid REFERENCES rca.debriefs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block_id        uuid REFERENCES rca.debrief_blocks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS threads_debrief_idx ON rca.threads (debrief_id);


-- ── 12. BACK HOME VOICE NOTE META ───────────────────────────
-- "voice · 1:24 · recorded Day 8"
ALTER TABLE rca.translations
  ADD COLUMN IF NOT EXISTS note_duration_s int4,
  ADD COLUMN IF NOT EXISTS recorded_day    int4;


-- ── 13. RLS — match the v1 convention exactly ───────────────
ALTER TABLE rca.reading_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca.bookmarks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca.student_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca.debrief_drills     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca.debrief_drill_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca.video_markers      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'reading_progress','bookmarks','student_notes',
    'debrief_drills','debrief_drill_logs','video_markers'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'rca' AND tablename = t
        AND policyname = 'rca ' || t || ' allow all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON rca.%I FOR ALL USING (true) WITH CHECK (true)',
        'rca ' || t || ' allow all', t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- After applying: regenerate supabase/schema.sql and
-- lib/database.types.ts (which is currently missing students.person_id).
-- ============================================================