-- =============================================
-- RCA Surf Clinic App — Supabase Schema
-- Run this in Supabase → SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Clinics (1–6) ──────────────────────────────
create table if not exists clinics (
  id         serial primary key,
  number     int not null unique check (number between 1 and 6),
  name       text not null,
  created_at timestamptz default now()
);

-- Seed the 6 clinics
insert into clinics (number, name) values
  (1, 'Clinic 1'),
  (2, 'Clinic 2'),
  (3, 'Clinic 3'),
  (4, 'Clinic 4'),
  (5, 'Clinic 5'),
  (6, 'Clinic 6')
on conflict (number) do nothing;

-- ── Students ───────────────────────────────────
create table if not exists students (
  id              uuid primary key default uuid_generate_v4(),
  clinic_id       int not null references clinics(id) on delete cascade,
  name            text not null,
  md_content      text,                          -- raw markdown from coach
  key_points      text[],                        -- 3 extracted key points
  vision_1st_url  text,                          -- first-person vision video
  vision_3rd_url  text,                          -- third-person vision video
  created_at      timestamptz default now()
);

-- ── Sessions (day 1–20, session 1–5 per day) ──
create table if not exists sessions (
  id             uuid primary key default uuid_generate_v4(),
  student_id     uuid not null references students(id) on delete cascade,
  clinic_id      int not null references clinics(id),
  day_number     int not null check (day_number between 1 and 20),
  session_number int not null check (session_number between 1 and 5),
  date           date not null default current_date,
  created_at     timestamptz default now(),
  unique (student_id, day_number, session_number)
);

-- ── Check-ins (emotional + environmental state) ──
create table if not exists check_ins (
  id                       uuid primary key default uuid_generate_v4(),
  session_id               uuid not null references sessions(id) on delete cascade,
  student_id               uuid not null references students(id) on delete cascade,
  -- 0 = Calm, 50 = Anxious, 100 = Aggressive
  emotional_state          int not null check (emotional_state between 0 and 100),
  -- 0 = Ideal, 50 = Distracting, 100 = Hostile
  environmental_perception int not null check (environmental_perception between 0 and 100),
  notes                    text,
  created_at               timestamptz default now()
);

-- ── Wave logs (per wave within a session) ──────
create table if not exists wave_logs (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references sessions(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade,
  wave_number   int not null,
  before_notes  text,
  during_notes  text,
  after_notes   text,
  social_notes  text,   -- who they vibed with
  is_success    boolean,
  created_at    timestamptz default now()
);

-- ── Daily stats (wave count + tries) ───────────
create table if not exists daily_stats (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid not null references students(id) on delete cascade,
  session_id    uuid not null references sessions(id) on delete cascade,
  day_number    int not null,
  wave_count    int not null default 0,
  success_count int not null default 0,
  bad_count     int not null default 0,
  created_at    timestamptz default now()
);

-- ── Indexes ─────────────────────────────────────
create index if not exists idx_students_clinic on students(clinic_id);
create index if not exists idx_sessions_student on sessions(student_id);
create index if not exists idx_check_ins_session on check_ins(session_id);
create index if not exists idx_wave_logs_session on wave_logs(session_id);
create index if not exists idx_daily_stats_student on daily_stats(student_id);

-- ── RLS: Public read/write for now (tighten later) ──
alter table clinics    enable row level security;
alter table students   enable row level security;
alter table sessions   enable row level security;
alter table check_ins  enable row level security;
alter table wave_logs  enable row level security;
alter table daily_stats enable row level security;

create policy "allow all" on clinics     for all using (true) with check (true);
create policy "allow all" on students    for all using (true) with check (true);
create policy "allow all" on sessions    for all using (true) with check (true);
create policy "allow all" on check_ins   for all using (true) with check (true);
create policy "allow all" on wave_logs   for all using (true) with check (true);
create policy "allow all" on daily_stats for all using (true) with check (true);
