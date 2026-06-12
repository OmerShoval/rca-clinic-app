# OCEAN ATHLETE — MASTER BUILD SPEC
### The plan to hand to Antigravity (or Claude Code), phase by phase

**App:** rca-clinic-app.vercel.app (existing Next.js on Vercel)
**Owner:** Omer Shoval · Coach Omer / Ocean Athlete
**Date:** June 2026
**Reference mockups (the source of truth for look and feel):**
- `login-flow-mockup.html` — sign in, greeting, merged home
- `student-app-v2.html` — My Waves, Back Home, Ask Omer (animated)
- `coach-dashboard-v2.html` — coach editor + inbox (animated, mobile-first)

---

## 0. NON-NEGOTIABLE RULES (paste these into every agent session)

1. **Never break the existing Journal and Meditation features.** They are live and loved. Any refactor must keep their data and behavior intact. Write a smoke test for both before touching anything.
2. **Mobile first.** Every screen is designed at 390px width first, desktop second. Students use this on the beach.
3. **The mirror rule.** Every field in the coach dashboard maps 1:1 to a card in the student view. No orphan fields, no student content without a coach editor for it.
4. **No video hosting in v1.** Every video slot stores a URL (CoachNow share link, unlisted Vimeo/YouTube, Drive). Player component renders by provider. Mux/Cloudflare Stream is a v2 decision.
5. **Data scoping is law.** Every query filters by `student_id` derived from the session. A student can never receive another student's rows, even by URL guessing.
6. **Match the design tokens exactly** (section 1). No new colors, no new fonts.
7. **Respect `prefers-reduced-motion`** on every animation.
8. Work in small PRs per phase step. Never refactor outside the step's scope.

---

## 1. DESIGN TOKENS (single source of truth)

```css
:root{
  --abyss:#070f15;        /* page background */
  --depth:#0d1a1f;        /* surface / phone bg */
  --glass:rgba(255,255,255,.055);
  --glass-edge:rgba(255,255,255,.10);
  --gold:#e0b64f;         /* goals, next steps, CTAs, handles */
  --gold-soft:rgba(224,182,79,.16);
  --teal:#2fd6c0;         /* corrections, feelings, progress */
  --teal-soft:rgba(47,214,192,.14);
  --coral:#ff6b5e;        /* mistakes, new/unread */
  --coral-soft:rgba(255,107,94,.14);
  --ink:#f1eee6; --ink-dim:rgba(241,238,230,.62); --ink-faint:rgba(241,238,230,.38);
}
```

**Type:** Bebas Neue for display/labels (always letter-spaced, uppercase). Inter for body.
**Color logic (the clarity system):** coral = mistake, teal = correction + felt-sense, gold = goal + next step. Never mix these meanings.
**Card grammar:** glassmorphism card, 16–18px radius, 2px colored spine on the left edge showing arc position.

**Animation vocabulary (reuse, don't invent):**
- `riseIn` — opacity 0→1, translateY 18px→0, ~.5s ease, staggered 60–80ms between siblings
- Wave wipe — full-screen teal-tinted curve sweeping bottom→top, ~1.1s, used for login transition only
- Letter pop — greeting name reveals letter by letter, 70ms stagger
- Gold sheen — slow diagonal shimmer across primary CTAs, 3–4s loop
- Handle nudge — sliders gently oscillate to invite dragging
- Scroll reveal — IntersectionObserver, threshold .12, stagger capped at 360ms

---

## 2. DATA MODEL (Supabase Postgres)

```
clinics        id, name, location, start_date, end_date, status
students       id, clinic_id, full_name, slug, pin_hash (nullable v1),
               stage (1-5), awareness (1-5), execution (1-5), focus_skill,
               whatsapp_number, status (draft|live)
debriefs       id, student_id, wave_label ("Wave 3"), day_number,
               status (draft|published), published_at
debrief_blocks id, debrief_id, type (mistake|correction|improvement|goal|next_step),
               sort, title, body, felt_sense_quote,
               timestamp_marker, where_on_wave, why_it_happened,
               video_url, video_url_secondary (FPV pair / before-after pair)
translations   id, student_id, environment (israel_ocean|wave_pool),
               whats_different, try_first, on_wave_reminder,
               video_url, personal_note_url (voice/video from Omer)
threads        id, student_id, title, question_text, clip_url,
               status (new|in_review|answered), reply_url, reply_type (video|voice|whatsapp),
               submitted_at, answered_at
journal_entries  (EXISTING — do not modify schema, only re-route UI)
meditations      (EXISTING — same)
sessions       student_id, device_token, created_at
```

**Routes:**
```
/                    → name login (clinic selector removed for students)
/s/[slug]            → student home (time-aware: clinic mode vs home mode)
/s/[slug]/waves      → My Waves (debrief list → debrief story)
/s/[slug]/home-base  → Back Home (env toggle: Israel / Wave pool)
/s/[slug]/ask        → Ask Omer (submit + threads)
/s/[slug]/journal    → existing journal, re-skinned shell only
/s/[slug]/meditate   → existing meditation, re-skinned shell only
/coach               → dashboard (password auth, Omer only)
```

---

## 3. PHASES — GIVE ANTIGRAVITY ONE PHASE AT A TIME

### PHASE 1 — Foundation: tokens, login, personal routing  *(ship first)*
**Agent instruction:**
"Implement the design token system from section 1 as CSS variables + a shared `<Card>`, `<Tag>`, `<VideoSlot>` component set. Build the name-login flow exactly per `login-flow-mockup.html`: name input with roster autocomplete (min 2 chars, prefix match on first or last name), wave-wipe transition, letter-by-letter greeting with stage progress bar, landing on the student home. Create the `students` + `clinics` + `sessions` tables. Route students to `/s/[slug]`. Persist session in localStorage + cookie so returning students skip login. Migrate the existing Journal and Meditation screens to render inside the new home as ritual cards, behavior unchanged. Remove the clinic selector from the student path."

**Acceptance:** Noy types "no", taps her card, sees the animated greeting, lands on home with working Journal and Meditation. Refreshing skips login. Visiting another student's slug while in Noy's session redirects to Noy's home.

### PHASE 2 — Coach dashboard core
**Agent instruction:**
"Build `/coach` per `coach-dashboard-v2.html`. Password auth (env var, bcrypt). Left roster grouped by clinic (horizontal scroll chips under 1100px). Student CRUD: add student → name, clinic, focus skill, stage, awareness/execution, WhatsApp number. Debrief editor with the five arc blocks (mistake / correction / improvement / goal / next step), each matching the student card 1:1: text fields per section 2 schema, video URL slots (paste-link v1), FPV + third-person pair on correction, before/after pair on improvement, single slots on goal and next step. Tabs for Back Home Israel and Back Home Wave Pool with their own fields, video slot, and personal-note recorder (MediaRecorder API → upload to Supabase storage, audio v1). Draft/Publish toggle per debrief; students only ever see published."

**Acceptance:** Omer creates a student, fills a full debrief on his phone, records a voice note, publishes. Draft content is invisible to the student.

### PHASE 3 — Student debrief experience
**Agent instruction:**
"Build My Waves and Back Home per `student-app-v2.html`. My Waves: list of published debriefs → story view with the coral/teal/gold arc, scroll-reveal stagger, video player per provider URL, before/after gold-handle slider (drag, touch), FPV/third-person slider on the correction, felt-sense teal quote block, goal + next step cards with optional videos, CTA 'See how to train this at home' deep-linking to Back Home. Back Home: env toggle (Israeli ocean / Wave pool), comparison card (Cabo Ledo vs home), Omer's personal note player at top, try-first card, on-wave reminder, next step → CTA into Ask Omer."

**Acceptance:** Noy scrolls one continuous story, both sliders work with touch, every block content is editable from the dashboard and updates after publish.

### PHASE 4 — Ask Omer loop
**Agent instruction:**
"Build the Ask Omer tab and the coach inbox. Student: drop a clip URL or upload ≤60s file to Supabase storage, one question text, sees the SLA banner (review day + answer-by configurable in coach settings) and their threads with status chips. Coach inbox: new / in review / answered columns, open clip, paste reply URL or record voice reply, mark answered. On answered: fire WhatsApp notification via WhatsApp Business API (or wa.me deep link v1) to the student's number: 'Omer answered your wave — open your space.' Status updates live in the student thread."

**Acceptance:** Round trip works on two phones: submit → appears in inbox → reply → student gets WhatsApp ping → thread shows answered with playable reply.

### PHASE 5 — Polish + seasons
"Time-aware home: while `clinic.status = active`, rituals (Journal, Meditation, intention) lead the home screen; after end_date, debrief cards lead and journal becomes weekly pulse. Add the 4-digit PIN option per student (set in dashboard, asked once per device). Add 'preview as student' button in the coach editor. Lighthouse mobile ≥ 90, reduced-motion audit, RTL-readiness check for future Hebrew."

---

## 4. WHAT NOT TO BUILD (v1 discipline)

- No video annotation/drawing tools (CoachNow does this)
- No payments yet — the 'upgrade' button links to WhatsApp
- No multi-coach roles, no student-to-student anything
- No native app — PWA manifest + add-to-homescreen is enough
- No AI features yet; the structure is being built so they slot in later

---

## 5. ORDER OF OPERATIONS FOR YOU, OMER

1. Reconnect Firecrawl (token expired) if you want more reference pulls.
2. Decide: PIN on journals yes/no (recommended: yes).
3. Confirm review day for the SLA (Sunday review → Monday answers assumed).
4. Hand Phase 1 + sections 0–2 of this doc + the three mockup HTML files to Antigravity in one session. One phase per session after that.
5. After each phase, test on your phone in Luanda bandwidth conditions before approving the next.
