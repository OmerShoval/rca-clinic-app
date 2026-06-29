-- ============================================================
-- RCA Clinic App — live rca schema (auto-generated 2026-06-29)
-- Source: Supabase project xaihkccorjyzwayydbbc, schema: rca
-- DO NOT hand-edit. Regenerate after every migration.
-- The public schema is a separate Clinic 1 website — never touch it here.
-- ============================================================

CREATE TABLE rca.clinics (
  id int4 NOT NULL DEFAULT nextval('rca.clinics_id_seq'::regclass),
  number int4 NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  location text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'upcoming'  -- upcoming | active | completed
);

CREATE TABLE rca.people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rca.movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stage int4 NOT NULL DEFAULT 1,  -- 1..5
  sort int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
  -- seed: Pop up and stance (1), Wave reading and positioning (2),
  --       Turn entry and back foot pressure (3), Wall stick and hand release (4),
  --       Advanced movements (5)
);

CREATE TABLE rca.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id int4 NOT NULL,          -- FK → rca.clinics(id)
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  slug text NOT NULL,               -- unique URL slug
  pin_hash text,                    -- SHA-256 of 4-digit PIN, nullable = no PIN set
  focus_skill text,
  whatsapp_number text,
  status text NOT NULL DEFAULT 'draft',   -- draft | live
  build_strategy jsonb,             -- React Flow nodes+edges
  training_program jsonb,
  person_id uuid                    -- FK → rca.people(id), added phase0
);

CREATE TABLE rca.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,         -- FK → rca.students(id)
  device_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
  -- cookie name: oa_token (httpOnly, 90 days)
);

CREATE TABLE rca.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rca.debriefs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,         -- FK → rca.students(id)
  wave_label text NOT NULL,
  day_number int4,
  status text NOT NULL DEFAULT 'draft',   -- draft | published
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  tag text,                         -- free-text label (not FK)
  cover_color_index int2,           -- 0-5 palette index
  cover_image_url text,             -- Supabase storage URL
  session_video_url text,           -- CF Stream iframe URL
  summary_went_well text,
  summary_learned text,
  summary_coach_view text,
  summary_felt text,
  summary_grateful text
);

CREATE TABLE rca.debrief_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  debrief_id uuid NOT NULL,         -- FK → rca.debriefs(id)
  type text NOT NULL,               -- mistake | correction | improvement | goal | next_step
  sort int4 NOT NULL DEFAULT 0,
  title text,
  body text,
  felt_sense_quote text,
  timestamp_marker text,
  where_on_wave text,
  why_it_happened text,
  video_url text,
  video_url_secondary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  movement_id uuid                  -- FK → rca.movements(id), added phase0
);

CREATE TABLE rca.student_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,         -- FK → rca.students(id)
  video_url text NOT NULL,
  label text NOT NULL DEFAULT '',
  day_number int4,
  kind text NOT NULL DEFAULT 'session',  -- session | node | reference
  debrief_id uuid,                  -- FK → rca.debriefs(id), nullable
  created_at timestamptz NOT NULL DEFAULT now(),
  movement_id uuid,                 -- FK → rca.movements(id), added phase0
  wave_type text,                   -- added phase0
  is_best bool NOT NULL DEFAULT false,   -- added phase0
  analysis jsonb                    -- {time_on_wave, speed_relative, foot_tag}, added phase0
);

CREATE TABLE rca.translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,         -- FK → rca.students(id)
  environment text NOT NULL,        -- israel_ocean | wave_pool
  whats_different text,
  try_first text,
  on_wave_reminder text,
  video_url text,
  personal_note_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rca.threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,         -- FK → rca.students(id)
  title text,
  question_text text NOT NULL,
  clip_url text,
  status text NOT NULL DEFAULT 'new',   -- new | in_review | answered
  reply_url text,
  reply_type text,                  -- video | voice | whatsapp
  submitted_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  step_ref text
);

CREATE TABLE rca.habit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,         -- FK → rca.students(id)
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_habits text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS: all tables enabled, all use allow-all policy for v1.
-- Data scoping is enforced at the API route layer via service-role key.
-- ============================================================
-- clinics:        "allow all"
-- people:         "rca people allow all"
-- movements:      "rca movements allow all"
-- students:       "allow all"
-- sessions:       "rca sessions allow all"
-- tags:           "rca tags allow all"
-- debriefs:       "rca debriefs allow all"
-- debrief_blocks: "rca blocks allow all"
-- student_videos: "rca student_videos allow all"
-- translations:   "rca translations allow all"
-- threads:        "rca threads allow all"
-- habit_logs:     "rca habit_logs allow all"
