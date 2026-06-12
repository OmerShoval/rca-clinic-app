# OCEAN ATHLETE — MASTER BUILD SPEC
### The plan to hand to Claude Code (or any agent), phase by phase

**App:** rca-clinic-app.vercel.app (existing Next.js on Vercel)
**Owner:** Omer Shoval · Coach Omer / Ocean Athlete
**Date:** June 2026
**Reference mockups (the source of truth for look and feel):**
- `login-flow-mockup.html` — sign in, greeting, merged home
- `student-app-v2.html` — My Waves, Back Home, Ask Omer (animated)
- `coach-dashboard-v2.html` — coach editor + inbox (animated, mobile-first)

---

## 0. NON-NEGOTIABLE RULES (paste these into every agent session)

1. **The old student tracking app is being replaced.** The current codebase has a self-tracking SPA (check-ins, wave logs, day/session picker, progress analytics). That entire flow is gone. DELETE those components. The new app is a coach-delivered debrief experience. There are no existing Journal or Meditation screens in this codebase — "existing" only refers to tables in the `public` schema owned by the Clinic 1 website on the same Supabase project. Never touch the `public` schema.
2. **Mobile first.** Every screen is designed at 390px width first, desktop second. Students use this on the beach in Luanda.
3. **The mirror rule.** Every field in the coach dashboard maps 1:1 to a card in the student view. No orphan fields, no student content without a coach editor for it.
4. **No video hosting in v1.** Every video slot stores a URL (CoachNow share link, unlisted Vimeo/YouTube, Google Drive preview link). The `<VideoSlot>` component detects the provider from the URL and renders the correct embed. Mux/Cloudflare Stream is a v2 decision.
5. **Data scoping is law.** All student data reads go through Next.js server-side API routes that validate the `device_token` cookie against the `rca.sessions` table before returning any rows. The Supabase anon key is never used for data reads on student routes — use the server-side Supabase client (service role key) inside API routes and Server Components only.
6. **Match the design tokens exactly** (section 1). No new colors. No new fonts. No light mode — always dark.
7. **Respect `prefers-reduced-motion` on every animation.** Use a shared `useMotionVariants()` hook (see section 1 animation vocabulary). Every Framer Motion component calls this hook instead of defining inline variants.
8. **Initialize git first, then commit after each named step.** The repo has no git history yet — `git init` is the first action of Phase 1. Work in small, labelled commits (e.g., `phase1/tokens`, `phase1/schema`, `phase1/login`). Never refactor outside the step's scope.
9. **Never add a ThemeToggle.** The app is always dark. Remove the existing `components/theme-toggle.tsx` and `lib/use-theme.ts` in Phase 1 cleanup.

---

## 1. DESIGN TOKENS (single source of truth)

### CSS Variables — add to `globals.css` (always-dark, no light mode)

```css
:root {
  /* Spec-specific tokens — use these directly in custom components */
  --abyss: #070f15;           /* page background */
  --depth: #0d1a1f;           /* surface / card bg */
  --glass: rgba(255,255,255,.055);
  --glass-edge: rgba(255,255,255,.10);
  --gold: #e0b64f;            /* goals, next steps, CTAs, handles */
  --gold-soft: rgba(224,182,79,.16);
  --teal: #2fd6c0;            /* corrections, feelings, progress */
  --teal-soft: rgba(47,214,192,.14);
  --coral: #ff6b5e;           /* mistakes, new/unread */
  --coral-soft: rgba(255,107,94,.14);
  --ink: #f1eee6;
  --ink-dim: rgba(241,238,230,.62);
  --ink-faint: rgba(241,238,230,.38);

  /* shadcn variable bridge — maps spec tokens to shadcn's expected names */
  --background: #070f15;
  --foreground: #f1eee6;
  --card: #0d1a1f;
  --card-foreground: #f1eee6;
  --popover: #0d1a1f;
  --popover-foreground: #f1eee6;
  --primary: #2fd6c0;
  --primary-foreground: #070f15;
  --secondary: rgba(255,255,255,.06);
  --secondary-foreground: #f1eee6;
  --muted: rgba(255,255,255,.06);
  --muted-foreground: rgba(241,238,230,.62);
  --accent: #e0b64f;
  --accent-foreground: #070f15;
  --destructive: #ff6b5e;
  --destructive-foreground: #070f15;
  --border: rgba(255,255,255,.10);
  --input: rgba(255,255,255,.08);
  --ring: #2fd6c0;
  --radius: 1rem;

  color-scheme: dark;
}
```

Add Tailwind color aliases in the `@theme inline` block so you can write `bg-abyss`, `text-gold`, `text-teal`, `text-coral`, `bg-depth`, `border-glass-edge` in utility classes:

```css
@theme inline {
  --color-abyss: var(--abyss);
  --color-depth: var(--depth);
  --color-gold: var(--gold);
  --color-teal: var(--teal);
  --color-coral: var(--coral);
  --color-ink: var(--ink);
  --color-ink-dim: var(--ink-dim);
  --color-ink-faint: var(--ink-faint);
  --color-glass-edge: var(--glass-edge);
  /* ... plus the existing shadcn --color-* aliases */
}
```

### Fonts — update `app/layout.tsx`

Replace Geist with:

```tsx
import { Bebas_Neue, Inter } from "next/font/google";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});
```

Apply both variables to `<html>`. In `globals.css`:

```css
body { font-family: var(--font-sans), system-ui, sans-serif; }
.font-display, [class*="font-display"] {
  font-family: var(--font-display), sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

**Color logic (the clarity system):** coral = mistake/error/unread, teal = correction + felt-sense + progress, gold = goal + next step + CTA. Never mix these meanings.

**Card grammar:** glassmorphism `background: var(--glass)`, `border: 1px solid var(--glass-edge)`, `border-radius: 16–18px`. Optional 2px colored left spine for arc position.

### Animation vocabulary — shared `lib/motion.ts`

Create this file once. Every animated component imports variants from here instead of defining inline.

```ts
import { useReducedMotion } from "motion/react";

export function useMotionVariants() {
  const reduce = useReducedMotion();

  const riseIn = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  const staggerChildren = (stagger = 0.07) => ({
    show: { transition: { staggerChildren: reduce ? 0 : stagger } },
  });

  const fadeIn = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.35 } },
  };

  return { riseIn, staggerChildren, fadeIn };
}
```

- `riseIn` — opacity 0→1, translateY 18px→0, ~0.5s ease, staggered 70ms between siblings
- Wave wipe — full-screen teal curve sweep (login transition only). Implement with Framer Motion `clipPath` on a full-viewport `<div>` with `border-radius: 100% 0 0 0 / 50% 0 0 0`, animating from `"inset(100% 0 0 0 round 80% 0 0 80%)"` to `"inset(0% 0 0 0 round 0)"`, duration 1.1s, ease `[0.76, 0, 0.24, 1]`. Background: `rgba(47,214,192,0.12)`. Triggers on student card tap in login.
- Letter pop — greeting name reveals letter by letter, stagger = `Math.min(70, 400 / name.length)` ms so max total is 400ms regardless of name length.
- Gold sheen — slow diagonal shimmer on gold CTAs. CSS `::after` pseudo-element with `background: linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent)`, animation `3.5s ease-in-out infinite`, `left` from `-80%` to `130%`.
- Scroll reveal — `IntersectionObserver`, threshold `0.12`, stagger capped at 360ms total.

---

## 2. DATA MODEL (Supabase Postgres — `rca` schema)

### Migration SQL — run this FIRST in Supabase SQL Editor before any Phase 1 code

```sql
-- ── Step 1: Drop old tracking tables (no longer needed in v3) ──────────────
drop table if exists rca.daily_stats  cascade;
drop table if exists rca.wave_logs    cascade;
drop table if exists rca.check_ins    cascade;
drop table if exists rca.sessions     cascade;  -- old day/session tracking table

-- ── Step 2: Alter rca.clinics — add new columns ───────────────────────────
alter table rca.clinics
  add column if not exists location   text,
  add column if not exists start_date date,
  add column if not exists end_date   date,
  add column if not exists status     text not null default 'upcoming'
    check (status in ('upcoming','active','completed'));

-- ── Step 3: Alter rca.students — major schema upgrade ─────────────────────
-- Rename name → full_name
alter table rca.students rename column name to full_name;

-- Drop old columns that are replaced by the new debrief model
alter table rca.students
  drop column if exists md_content,
  drop column if exists key_points,
  drop column if exists vision_1st_url,
  drop column if exists vision_3rd_url,
  drop column if exists meditations;

-- Add new columns
alter table rca.students
  add column if not exists slug             text unique,
  add column if not exists pin_hash         text,
  add column if not exists stage            int not null default 1
    check (stage between 1 and 5),
  add column if not exists awareness        int not null default 1
    check (awareness between 1 and 5),
  add column if not exists execution        int not null default 1
    check (execution between 1 and 5),
  add column if not exists focus_skill      text,
  add column if not exists whatsapp_number  text,
  add column if not exists status           text not null default 'draft'
    check (status in ('draft','live'));

-- Back-fill slugs from existing names (converts "Noy Bar Lev" → "noy-bar-lev")
update rca.students
  set slug = lower(regexp_replace(full_name, '\s+', '-', 'g'))
  where slug is null;

-- Make slug not-null after back-fill
alter table rca.students alter column slug set not null;

-- ── Step 4: Create rca.sessions (auth — device tokens) ───────────────────
create table if not exists rca.sessions (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references rca.students(id) on delete cascade,
  device_token uuid not null unique default gen_random_uuid(),
  created_at   timestamptz not null default now()
);

-- ── Step 5: Create rca.debriefs ──────────────────────────────────────────
create table if not exists rca.debriefs (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references rca.students(id) on delete cascade,
  wave_label   text not null,          -- e.g. "Wave 3"
  day_number   int,
  status       text not null default 'draft'
    check (status in ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ── Step 6: Create rca.debrief_blocks ────────────────────────────────────
create table if not exists rca.debrief_blocks (
  id                  uuid primary key default gen_random_uuid(),
  debrief_id          uuid not null references rca.debriefs(id) on delete cascade,
  type                text not null
    check (type in ('mistake','correction','improvement','goal','next_step')),
  sort                int not null default 0,
  title               text,
  body                text,
  felt_sense_quote    text,
  timestamp_marker    text,
  where_on_wave       text,
  why_it_happened     text,
  video_url           text,
  video_url_secondary text,           -- FPV pair / before-after pair
  created_at          timestamptz not null default now()
);

-- ── Step 7: Create rca.translations (Back Home content) ──────────────────
create table if not exists rca.translations (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references rca.students(id) on delete cascade,
  environment         text not null
    check (environment in ('israel_ocean','wave_pool')),
  whats_different     text,
  try_first           text,
  on_wave_reminder    text,
  video_url           text,
  personal_note_url   text,           -- Omer's voice/video note
  created_at          timestamptz not null default now(),
  unique (student_id, environment)
);

-- ── Step 8: Create rca.threads (Ask Omer) ────────────────────────────────
create table if not exists rca.threads (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references rca.students(id) on delete cascade,
  title          text,
  question_text  text not null,
  clip_url       text,
  status         text not null default 'new'
    check (status in ('new','in_review','answered')),
  reply_url      text,
  reply_type     text check (reply_type in ('video','voice','whatsapp')),
  submitted_at   timestamptz not null default now(),
  answered_at    timestamptz
);

-- ── Step 9: RLS policies (server enforces scoping; DB stays open for now) ─
-- Note: data scoping is enforced at the Next.js API route layer using the
-- service role key + device_token validation. RLS remains permissive here
-- and will be tightened in Phase 5 with proper JWT claims.
create policy if not exists "rca sessions allow all"   on rca.sessions    for all using (true) with check (true);
create policy if not exists "rca debriefs allow all"   on rca.debriefs    for all using (true) with check (true);
create policy if not exists "rca blocks allow all"     on rca.debrief_blocks for all using (true) with check (true);
create policy if not exists "rca translations allow all" on rca.translations for all using (true) with check (true);
create policy if not exists "rca threads allow all"    on rca.threads     for all using (true) with check (true);

alter table rca.sessions     enable row level security;
alter table rca.debriefs     enable row level security;
alter table rca.debrief_blocks enable row level security;
alter table rca.translations enable row level security;
alter table rca.threads      enable row level security;

-- ── Step 10: Indexes ─────────────────────────────────────────────────────
create index if not exists idx_students_slug       on rca.students(slug);
create index if not exists idx_sessions_token      on rca.sessions(device_token);
create index if not exists idx_debriefs_student    on rca.debriefs(student_id);
create index if not exists idx_blocks_debrief      on rca.debrief_blocks(debrief_id);
create index if not exists idx_translations_student on rca.translations(student_id);
create index if not exists idx_threads_student     on rca.threads(student_id);

-- ── Step 11: Seed Noy as test student (run once) ────────────────────────
-- Replace clinic_id with the actual ID of your clinic after checking with:
--   select id from rca.clinics limit 5;
insert into rca.students (clinic_id, full_name, slug, stage, awareness, execution, focus_skill, status)
values (
  (select id from rca.clinics limit 1),
  'Noy Bar Lev',
  'noy-bar-lev',
  2, 3, 2,
  'Bottom turn',
  'live'
) on conflict (slug) do nothing;
```

### Final schema at a glance

```
rca.clinics      id (serial), number (1–6), name, location, start_date, end_date,
                 status (upcoming|active|completed), created_at

rca.students     id (uuid), clinic_id, full_name, slug (unique), pin_hash,
                 stage (1–5), awareness (1–5), execution (1–5), focus_skill,
                 whatsapp_number, status (draft|live), created_at

rca.sessions     id (uuid), student_id, device_token (uuid, unique), created_at
                 — auth only, one row per device per student

rca.debriefs     id, student_id, wave_label, day_number, status (draft|published),
                 published_at, created_at

rca.debrief_blocks  id, debrief_id, type (mistake|correction|improvement|goal|next_step),
                    sort, title, body, felt_sense_quote, timestamp_marker,
                    where_on_wave, why_it_happened, video_url, video_url_secondary

rca.translations id, student_id, environment (israel_ocean|wave_pool),
                 whats_different, try_first, on_wave_reminder,
                 video_url, personal_note_url

rca.threads      id, student_id, title, question_text, clip_url,
                 status (new|in_review|answered), reply_url, reply_type,
                 submitted_at, answered_at
```

### Routes

```
/                      → name login
/s/[slug]              → student home (Server Component, cookie-gated)
/s/[slug]/waves        → My Waves (debrief list → debrief story)
/s/[slug]/home-base    → Back Home (env toggle)
/s/[slug]/ask          → Ask Omer
/coach                 → coach dashboard (password auth, Omer only)
/api/auth/session      → POST: create session, set cookie | GET: validate session
/api/students/search   → GET?q=: roster autocomplete (server-side, no anon key)
```

---

## 3. PHASES — ONE PHASE PER SESSION

---

### PHASE 1 — Foundation: git, schema, tokens, login, routing

**Context for agent:**
- Working directory: `/Users/omershoval/Clinic 2 application /rca-clinic-app`
- No git history yet. GitHub remote: `https://github.com/OmerShoval/rca-clinic-app`
- The current codebase is an old self-tracking SPA. Phase 1 replaces it entirely.
- Supabase project: `xaihkccorjyzwayydbbc` (eu-central-1), all tables in `rca` schema.
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`), `SUPABASE_SERVICE_ROLE_KEY` (add to `.env.local` — get from Supabase dashboard → Settings → API).
- Reference mockup: `v3-spec/login-flow-mockup.html`

---

#### Step 1.0 — Git init

```bash
git init
git add .gitignore package.json package-lock.json next.config.ts tsconfig.json components.json
git commit -m "phase1/init: initial project state"
git remote add origin https://github.com/OmerShoval/rca-clinic-app.git
git branch -M main
```

---

#### Step 1.1 — Run the migration SQL

Open Supabase dashboard → SQL Editor → paste and run the full migration SQL from section 2 above.  
Verify: `select full_name, slug, stage, status from rca.students;` should show Noy's row.

---

#### Step 1.2 — Clean up dead code

DELETE these files entirely — they belong to the old app:

```
components/clinic-selector.tsx
components/student-selector.tsx
components/check-in-screen.tsx
components/breathing-exercise.tsx
components/wave-session.tsx
components/progress-analytics.tsx
components/day-session-picker.tsx
components/in-depth-view.tsx
components/student-card.tsx
components/personal-meditation.tsx
components/theme-toggle.tsx
lib/use-theme.ts
lib/registry-theme.ts
```

Commit: `git commit -m "phase1/cleanup: remove old tracking app components"`

---

#### Step 1.3 — Design tokens + fonts

1. **`app/layout.tsx`** — Replace Geist with Bebas Neue + Inter as described in section 1. Remove the `localStorage` theme script from `<head>`. Always render `<html lang="en" className="dark">` — no dynamic class. Add both font variables to `<html>`.

2. **`app/globals.css`** — Full rewrite:
   - Delete both `:root` light and `html.dark` blocks
   - Replace with the single always-dark `:root` block from section 1
   - Add the `@theme inline` Tailwind color aliases from section 1
   - Add utility classes: `.font-display` (Bebas Neue, letter-spaced, uppercase), `.glass-card` (glassmorphism card base), `.gold-sheen` (shimmer pseudo-element on CTAs), `.spine-coral` / `.spine-teal` / `.spine-gold` (2px left border colors for debrief arc)
   - Remove the old `.glow-teal`, `.gradient-ocean`, `.gradient-wave`, `.text-teal`, `.text-sand`, `.bg-teal` utilities (replaced by Tailwind token aliases)

3. **`lib/motion.ts`** — Create the shared animation variants file exactly as defined in section 1.

Commit: `git commit -m "phase1/tokens: design system, fonts, motion variants"`

---

#### Step 1.4 — Supabase server client

**`lib/supabase.ts`** — Rewrite to export two clients:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Client-side: anon key, used ONLY for the login autocomplete (public data)
export const supabase = createClient<Database, "rca">(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "rca" } }
);

// Server-side: service role key — use ONLY in API routes and Server Components
// Never import this on the client; it bypasses RLS
export function createServerClient() {
  return createClient<Database, "rca">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "rca" }, auth: { persistSession: false } }
  );
}
```

**`lib/database.types.ts`** — Rewrite to match the new schema exactly (clinics, students, sessions, debriefs, debrief_blocks, translations, threads). Remove all old types (Session with day_number, CheckIn, WaveLog, DailyStat, KeyPoint, MeditationTrack).

---

#### Step 1.5 — Shared component kit

Build these three components. They are used across all phases.

**`components/ui/card-glass.tsx`** — The new base card (replaces old `card.tsx` logic):

```tsx
// Glassmorphism card with optional colored left spine.
// spine: "coral" | "teal" | "gold" | undefined
```

Props: `children`, `spine?: "coral" | "teal" | "gold"`, `className?`, `onClick?`.  
Styles: `background: var(--glass)`, `border: 1px solid var(--glass-edge)`, `border-radius: 16px`, left border 2px in spine color, Framer Motion `riseIn` on mount.

**`components/ui/tag.tsx`** — Spec label chip:

```tsx
// Small Bebas Neue label. variant: "coral" | "teal" | "gold"
```

Renders: uppercase, letter-spaced, `font-display`, pill shape with matching soft background color.

**`components/ui/video-slot.tsx`** — Video placeholder for Phase 1 (real embedding in Phase 3):

```tsx
// Detects provider from URL and shows a labelled placeholder.
// In Phase 3, this component gets upgraded to actual embeds.
```

URL detection logic (used in Phase 3 too — build it now):
- `youtube.com/watch` or `youtu.be` → provider = "YouTube", extract video ID
- `vimeo.com/` → provider = "Vimeo", extract video ID  
- `drive.google.com/file/d/` → provider = "Drive", extract file ID
- anything ending `.mp4`, `.mov`, `.webm` → provider = "Direct"
- else → provider = "Link"

Phase 1 render: dashed border box, 🎥 icon, provider label, URL preview (truncated). `border: 1.5px dashed var(--glass-edge)`, hover: `border-color: var(--teal)`. No actual video embed yet.

---

#### Step 1.6 — API routes (auth)

**`app/api/students/search/route.ts`** — roster autocomplete:

```ts
// GET /api/students/search?q=no
// Returns students where full_name ilike '%q%', min 2 chars.
// Uses server client (service role). Returns: [{ id, full_name, slug, stage, status }]
// Filter: only status = 'live'. Case-insensitive. Max 8 results.
```

**`app/api/auth/session/route.ts`**:

```ts
// POST { slug } → finds student by slug, upserts a sessions row,
//   sets httpOnly cookie "oa_token" = device_token (SameSite=Lax, path=/),
//   returns { studentId, slug }
//
// GET → reads "oa_token" cookie, validates against rca.sessions,
//   returns { studentId, slug } or 401 if invalid/missing.
//
// DELETE → clears the cookie (logout)
```

Cookie spec: name `oa_token`, value = device_token UUID string, `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 60 * 60 * 24 * 90` (90 days).

---

#### Step 1.7 — Middleware (slug redirect)

**`middleware.ts`** (at project root, not inside `app/`):

```ts
// Runs on /s/* routes.
// Reads "oa_token" cookie → calls /api/auth/session GET (or validates inline).
// If token is invalid: redirect to /.
// If token is valid but slug in URL ≠ student's slug: redirect to /s/[own-slug].
// This enforces Rule 5 even against URL guessing.
```

---

#### Step 1.8 — Login page (`app/page.tsx`)

Replace the entire current page with the name login. Match `v3-spec/login-flow-mockup.html` exactly.

Layout (mobile-first, 390px):
- Full-height `background: var(--abyss)`
- Centered vertically: `OCEAN ATHLETE` logo (Bebas Neue, teal, letter-spaced), subtitle "Your coaching space"
- Name input: Inter, pill shape, `background: var(--glass)`, `border: 1px solid var(--glass-edge)`, placeholder "Your name…"
- Autocomplete dropdown (appears below input at ≥2 chars, fetches from `/api/students/search`): each row shows full_name + stage bar. Keyboard navigable (↑↓ + Enter). Max 8 rows, `border-radius: 12px`, `background: var(--depth)`, `border: 1px solid var(--glass-edge)`.
- On student tap: POST to `/api/auth/session`, then trigger wave-wipe transition, then `router.push("/s/" + slug)`

Wave-wipe animation:
```tsx
// Framer Motion clipPath on a full-viewport absolute div, z-50, bg: rgba(47,214,192,0.1)
// initial: clipPath "inset(100% 0 0 0 round 80% 0 0 80%)"
// animate: clipPath "inset(0% 0 0 0 round 0)" 
// duration: 1.1s, ease: [0.76, 0, 0.24, 1]
// After animation completes → router.push triggers
```

If `useReducedMotion()` is true: skip the wave wipe, navigate instantly.

On page load: check `GET /api/auth/session`. If valid → `router.replace("/s/" + slug)` immediately (returning user skips login).

---

#### Step 1.9 — Student home (`app/s/[slug]/page.tsx`)

Server Component. Reads cookie from `cookies()` (Next.js), validates via `createServerClient()`, fetches student row. If invalid → `redirect("/")`.

Renders (mobile-first):
1. **Greeting header** — `OCEAN ATHLETE` eyebrow (Bebas Neue, teal, small), student's first name in large Bebas Neue with letter-pop animation (client island component), stage progress bar below (teal fill, `stage/5 * 100%`).
2. **Nav tabs** — horizontal bottom nav: My Waves · Back Home · Ask Omer (links to stub routes). Fixed to bottom of viewport.
3. **Ritual cards area** — Two stub cards (Framer Motion `riseIn`, staggered):
   - "My Waves" card — brief description, CTA arrow → `/s/[slug]/waves`
   - "Ask Omer" card — brief description, CTA arrow → `/s/[slug]/ask`

Stub routes — create these files returning a simple placeholder so the nav doesn't 404:
- `app/s/[slug]/waves/page.tsx` — "Coming soon" with back button
- `app/s/[slug]/home-base/page.tsx` — "Coming soon" with back button
- `app/s/[slug]/ask/page.tsx` — "Coming soon" with back button
- `app/s/[slug]/layout.tsx` — shared layout (just `children` for now; bottom nav can live here in Phase 3)

---

#### Step 1.10 — Final cleanup and commit

- Delete `lib/registry-theme.ts` if still present.
- Update `components.json` if shadcn config references removed utilities.
- Run `npx tsc --noEmit` — fix all TypeScript errors before committing.
- Run `npm run build` — fix any build errors.
- Commit: `git commit -m "phase1/complete: login, routing, tokens, auth"`
- Push: `git push -u origin main`

---

#### Phase 1 Acceptance Criteria

Before marking Phase 1 done, test all of these on a real phone (or Chrome DevTools at 390px):

1. **Noy's row exists** in Supabase: `select full_name, slug, stage, status from rca.students;` returns Noy with `slug = 'noy-bar-lev'`, `status = 'live'`.
2. **Login flow**: Open `/` → type "No" → autocomplete shows "Noy Bar Lev" → tap → wave-wipe plays → arrives at `/s/noy-bar-lev` with Noy's name and stage bar.
3. **Session persistence**: Refresh `/s/noy-bar-lev` → no login prompt, stays on home.
4. **Slug redirect**: Navigate to `/s/some-other-slug` while cookie is set for Noy → immediately redirects to `/s/noy-bar-lev`.
5. **No token = redirect**: Clear cookies, visit `/s/noy-bar-lev` directly → redirects to `/`.
6. **Always dark**: No ThemeToggle anywhere. Background is `#070f15`. No flash of light mode on load.
7. **Fonts correct**: Bebas Neue renders on headers/labels. Inter renders on body text.
8. **Mobile layout**: At 390px, all elements fit without horizontal scroll. Autocomplete is touch-friendly (min 44px tap targets).
9. **TypeScript + build**: `npx tsc --noEmit` and `npm run build` both succeed with zero errors.

---

### PHASE 2 — Coach dashboard core

**Agent instruction:**
Build `/coach` per `v3-spec/coach-dashboard-v2.html`. Password auth via env var `COACH_PASSWORD` — POST to `/api/coach/auth` which bcrypt-compares the submitted password and sets an `httpOnly` cookie `oa_coach`. Middleware blocks `/coach/*` without this cookie.

Left sidebar: roster grouped by clinic, horizontal scroll chips under 1100px. Student CRUD: add student with full_name, clinic, focus_skill, stage, awareness, execution, whatsapp_number, status. Slug auto-generated from full_name (lowercase, hyphenated).

Debrief editor: five arc blocks (mistake / correction / improvement / goal / next_step), each with text fields per section 2 schema, `<VideoSlot>` components (paste-link, two slots on correction and improvement, one slot on goal and next_step). Tab switcher for "My Waves" / "Back Home · Israel" / "Back Home · Wave Pool" editors. Translation fields (whats_different, try_first, on_wave_reminder, video_url, personal_note_url). MediaRecorder voice note recorder for `personal_note_url` → uploads to Supabase Storage bucket `rca-notes` (create this bucket in Supabase dashboard first). Draft/Publish toggle per debrief — students only see `status = 'published'` rows.

**Add "Preview as student" button** in the debrief editor header: opens `/s/[slug]` in a new tab so the coach can immediately see what the student will see.

**Acceptance:** Omer opens `/coach` on his phone, logs in, creates a student (Tal, Clinic 3, focus_skill "Trimming", stage 1), fills a full debrief with 5 blocks and 2 video URLs, records a 15-second voice note, publishes. Opening `/s/tal-slug` shows zero debriefs (they are published) — no wait, shows the published debrief. Draft content not visible to student. "Preview as student" button opens the student view correctly.

---

### PHASE 3 — Student debrief experience

**Agent instruction:**
Build My Waves and Back Home per `v3-spec/student-app-v2.html`.

**My Waves** (`/s/[slug]/waves`): list of published debriefs for this student (fetched via server route, device_token validated). Each debrief card shows wave_label + day_number, tap → full story view.

Story view: one continuous scroll of `debrief_blocks` ordered by `sort`. Each block uses `<CardGlass>` with spine color matching type (coral = mistake, teal = correction/improvement, gold = goal/next_step). Block content: title (Bebas Neue), body text, felt_sense_quote in teal italic, timestamp/where/why metadata. `<VideoSlot>` components now render actual embeds (upgrade the Phase 1 stub):
- YouTube: `<iframe src="https://www.youtube.com/embed/VIDEO_ID">` — extract VIDEO_ID from watch URL or youtu.be short URL
- Vimeo: `<iframe src="https://player.vimeo.com/video/VIDEO_ID">`
- Google Drive: `<iframe src="https://drive.google.com/file/d/FILE_ID/preview">` — extract FILE_ID from share URL
- Direct `.mp4`/`.mov`: `<video src controls playsInline>`
All iframes: `width="100%"`, `aspect-ratio: 16/9`, `border-radius: 12px`, `border: none`.

Correction block: before/after slider (two video slots, gold drag handle, touch-enabled via `pointer` events). Felt-sense quote block in teal. Improvement block: FPV/third-person slider, same pattern. Goal + next_step: single video, "See how to train this at home" CTA → `/s/[slug]/home-base`.

**Back Home** (`/s/[slug]/home-base`): env toggle chip (Israel / Wave pool), fetches matching `rca.translations` row. Shows: Omer's personal note player (audio `<source>` from personal_note_url), whats_different comparison card, try_first card, on_wave_reminder card. Bottom CTA "Ask Omer a question" → `/s/[slug]/ask`.

Scroll-reveal on all block cards: `IntersectionObserver`, threshold 0.12, stagger capped at 360ms.

**Acceptance:** Noy's debrief (created in Phase 2) scrolls as one continuous story. Both sliders work on touch. Videos play. Back Home shows the correct env. Every block reflects exactly what Omer typed in the dashboard. Publish a change in dashboard → student page shows it within one refresh (no caching issues).

---

### PHASE 4 — Ask Omer loop

**Agent instruction:**
Build `/s/[slug]/ask` and the coach inbox tab in `/coach`.

Student view: text area for question, optional video clip URL field (or file upload ≤60s to Supabase Storage bucket `rca-clips`), Submit button. SLA banner: "Omer reviews every Sunday · answers by Monday" (hardcoded for v1; make configurable in coach settings later). Below: list of student's threads with status chips (new/in_review/answered). Answered thread shows reply: play video/audio from reply_url, or "Omer replied on WhatsApp" if reply_type = 'whatsapp'.

Coach inbox (right panel in `/coach`): columns for new / in_review / answered. Open thread → see question text + clip. Reply options: paste video URL, record voice (MediaRecorder → upload to `rca-clips`), or mark as "answered via WhatsApp." On mark answered: update `status` to 'answered', set `answered_at`, set `reply_url` and `reply_type`. Notification to student: generate a `wa.me` deep link (`https://wa.me/[student.whatsapp_number]?text=...`) that the coach taps from their phone — this is the v1 WhatsApp notification (no API approval needed).

**Do NOT integrate WhatsApp Business API in v1.** The `wa.me` deep link IS the notification. The full API can be wired in v2 once Meta approval is in place.

**Acceptance:** Full round trip: student submits question → appears in coach inbox → coach pastes reply URL and marks answered → student thread shows answered with playable reply. `wa.me` link opens a pre-filled WhatsApp message on the coach's phone.

---

### PHASE 5 — Polish + seasons + PIN

**Agent instruction:**
Time-aware home: query `clinic.status` and `clinic.end_date` for the student's clinic. While `status = 'active'`, debrief cards lead the home screen and ritual cards (meditation, ask) appear below. After `end_date` passes, home mode shifts: personal note from latest translation leads, journal card becomes prominent for weekly reflection.

Add 4-digit PIN option: if `student.pin_hash` is set, prompt for PIN once per device after login (before completing session creation). PIN entry screen: 4 large digit buttons, Bebas Neue. Hashing: POST the raw PIN to `/api/auth/pin` → server bcrypt-compares against `pin_hash`, returns success/failure. Never expose `pin_hash` to the client. PIN is set in the coach dashboard (type PIN → POST to `/api/coach/set-pin` → bcrypt hash stored in DB).

Lighthouse mobile audit: target ≥ 90 performance. Fix any images missing `width`/`height`, lazy-load below-fold iframes, check font loading (display: swap already set). Run reduced-motion audit: toggle "prefers-reduced-motion" in DevTools → all animations should be instant, no visual jumps. RTL readiness check: wrap all user-facing strings in a translation key structure (even if English only for now) so Hebrew can slot in later.

**Acceptance:** Lighthouse mobile score ≥ 90. All animations respect prefers-reduced-motion. PIN flow works end-to-end. Time-aware home switches correctly based on clinic status.

---

## 4. WHAT NOT TO BUILD (v1 discipline)

- No video annotation or drawing tools (CoachNow does this)
- No payments — the 'upgrade' button links to WhatsApp
- No multi-coach roles, no student-to-student anything
- No native app — PWA manifest + add-to-homescreen is enough
- No AI features — the structure is being built so they slot in later
- No WhatsApp Business API in Phase 4 — `wa.me` deep link is sufficient for v1
- No check-in sliders, wave logging, or session tracking — that was the old app

---

## 5. ORDER OF OPERATIONS FOR YOU, OMER

1. **Before handing Phase 1 to the agent:** open Supabase SQL editor and run the full migration SQL from section 2. Verify Noy's row exists.
2. **Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`** — get it from Supabase dashboard → Settings → API → service_role key. This is secret; never commit it.
3. **Decide: PIN for journals yes/no** (recommended: yes, set up in Phase 5).
4. **Confirm review day for the SLA** (Sunday review → Monday answers assumed for the Phase 4 banner).
5. **Hand one phase at a time** to the agent. Include sections 0–2 of this doc and the relevant mockup HTML in every session prompt.
6. **After each phase, test on your phone** (Luanda bandwidth = test with throttled network in Chrome DevTools → "Slow 3G") before approving the next.
7. **WhatsApp Business API:** start the Meta approval process any time after Phase 4, so it's ready when you want to upgrade from `wa.me` links.
