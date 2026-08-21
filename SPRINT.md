# SPRINT.md — Ocean Athlete v2 · road to Aug 31 2026

**This file is the handoff. If you are a new agent session, or Omer picking this up cold,
read this file first — it is the single source of truth for where the work stands.**

Keep it updated at every checkpoint. It is committed to git, so `git log SPRINT.md`
is a full history of the sprint even if a chat context is lost.

---

## 0 · Mission

Get the RCA clinic app ready for a surf clinic starting **2026-08-31** with **12 athletes**
in Indonesia, on **Starlink** (good connectivity). Then redesign it to the
**Ocean Athlete v2** design canvas.

Coach: Omer Shoval, solo — he is the only person holding the coach password.

---

## 1 · The standing decision

**Refine this app. Do not rebuild.** Decided 2026-08-20 after a 22-agent audit;
3 of 3 independent critics agreed, high conviction.

The rebuild case rests on the auth model being fundamentally wrong. It is — but it is
wrong in **three files**, not three hundred (`requireCoachAuth()` is called by 19 routes),
so it was a ~30-line fix, not an architecture change.

**The one exception:** the Hebrew transcription / Student Book / RAG pipeline must be a
**separate service** — own repo, own runtime. It is a durable multi-hour job with a human
approval gate, not a Vercel route handler. Zero lines of it exist, so it is greenfield
either way. Build it in **September**, against real clinic recordings.

Full reasoning: https://claude.ai/code/artifact/bc6d8094-7975-4772-8e11-6d040cfe7423

---

## 2 · Status board

### Shipped
- [x] **Security hardening** — branch `hardening/aug31`, commit `0276bbb`. Not deployed.
      Coach cookie is now a signed expiring HMAC; roster dump closed; PINs mandatory.
      Verified end-to-end against a dev server on the live DB. See §4.
- [x] **Verification pass + two bug fixes** — commit `21875ec`. Caught a regression that
      locked the coach out of the dashboard (two page files held a second copy of the auth
      rule), and a pre-existing nested-`<button>` hydration error in the roster row.
      Verified: 3 coach pages, 9 student routes, 6 coach APIs, at 1440x900 and 375x812.
- [x] **Upload path unlock** — commit `d574d0f`. FFmpeg trim is now opt-in (was mandatory on
      every non-GIF drop: 32 MB WASM + single-threaded libx264 re-encode); validation now runs
      before content hashing, and hashing is skipped above 64 MB. `next build` compiles all 25 routes.

### In progress
- [ ] **Ocean Athlete v2 design analysis** — extracting the spec from the design canvas
      and mapping it against the existing code. See §6.

### Next, in leverage order
- [ ] **Bulk ingest surface** — `components/coach/video-uploader.tsx` is the ONLY dropzone in the
      repo (`upload-panel.tsx` is just the progress queue) and it is bound to a single video slot
      with `maxFiles: 1`. Multi-file ingest needs a NEW surface, not a flag change. Holding until
      the v2 design spec lands — the design has library and tagger screens that likely define it.
- [ ] **Hoist the upload provider** — create `app/coach/layout.tsx` with `<UploadManagerProvider>`,
      remove it from `app/coach/dashboard/page.tsx:24`. Today, navigating dashboard → library
      unmounts it and destroys in-flight Cloudflare transfers (one-time upload URL, unrecoverable).
- [ ] **Make saves loud** — `app/api/coach/debriefs/[id]/blocks/route.ts:80` returns `{ok:true}`
      unconditionally because Supabase builders resolve `{data,error}` and never throw.
      `components/coach/debrief-editor.tsx:467` never checks `res.ok`; `saveSummaryField` ends
      in `.catch(() => {})`. Add `lib/api-fetch.ts` with `AbortSignal.timeout(15000)` — there
      are currently **0** timeouts across 62 client fetches.
- [ ] **Rate limiting** — `rca.auth_attempts` table, 5 per slug per 15 min. Key per **slug**,
      never per IP: the whole cohort shares one hotspot.
- [ ] **Capture columns** (irreversible — cannot be backfilled after the cohort goes home):
      `students.consent_media`, `students.consent_recorded_at`; wire `voice-recorder.tsx` to
      persist against a student + day.
- [ ] **Ocean Athlete v2 implementation** — see §6 once the spec lands.

### Hard dates
- **Aug 28** — freeze. No new code after this, whatever is unfinished.
- **Aug 29** — dress rehearsal: real beach, real phone, real cellular. 20 clips, 3 debriefs, reload, verify.
- **Aug 30** — fix only what the rehearsal broke.
- **Aug 31** — clinic opens.

---

## 3 · Before any deploy

`COACH_SESSION_SECRET` **must be added to Vercel** or every coach login fails and Omer is
locked out of his own dashboard. The value is in local `.env.local`. Rotating it revokes
every coach session instantly — that is the intended emergency lever.

`noy-bar-lev` cannot log in until a PIN is set in the dashboard. That is the deliberate
tradeoff for closing the credential-free login path.

---

## 4 · Verified facts (do not re-derive)

Live database, project `xaihkccorjyzwayydbbc`, read 2026-08-20:

| | |
|---|---|
| students | 24 total, 14 live, 1 live without a PIN (`noy-bar-lev`) |
| sessions | 45 rows for 24 students — never revoked, never expired |
| student_videos | **9** (the clinic needs ~400 in five days) |
| debriefs / blocks | 13 / 65 |
| threads | 1 |
| habit_logs / translations | 0 / 0 |
| clinics / movements | 6 / 5 |

Codebase: 17,558 LOC, 115 files, 40 commits Jun 6 → Jul 7 2026.
**No tests, no CI, no pre-commit hooks.** `tsc --strict` is the only automated guard —
so every change needs manual verification, and that cost is real.

Dead-but-present schema: `student_videos.analysis`, `wave_type`, `movement_id` (written by one
route, read by nothing), `students.person_id` and the whole `rca.people` table (zero references
outside `lib/database.types.ts`). Do not make Aug 31 depend on waking any of them.

### Security state
Closed in `0276bbb`: forged coach cookie · roster wildcard dump · credential-free login.
**Still open** (post-clinic unless noted):
- Supabase anon key is in the public JS bundle (`lib/upload-client.ts:54,139`,
  `lib/upload-manager.tsx:204`) — rotate it, and move TUS to signed upload tokens.
- All `rca` tables have allow-all RLS; `rca-notes` bucket has public INSERT/UPDATE/DELETE/SELECT
  and holds named clients' voice recordings. **Make the bucket private before the clinic.**
- Cloudflare Stream uploads use `requireSignedURLs:false` — every athlete video is public by URL.
- Sessions never expire or revoke; `status='draft'` does not log a student out.
- No rate limiting anywhere.
- `DELETE /api/coach/students/[id]` orphans Cloudflare assets with no cleanup.

---

## 5 · Ground rules

1. **Additive only.** The `rca` schema holds real athlete data. No DROP, no destructive ALTER.
   The `public` schema belongs to the Clinic 1 website — never touch it.
2. **Branch, don't push to main.** Current branch: `hardening/aug31`.
3. **One driver at a time.** Claude Code and Antigravity share the same working tree —
   never run both on it simultaneously.
4. **Verify against a real server**, not by reading the diff. There are no tests to lean on.
5. **Year-round vault access is a product requirement.** Athletes from completed clinics must
   keep access — do not "fix" security by locking them out.
6. Port 3000 is occupied by a different Next project. Use `autoPort`.

---

## 5a · Redesign rules (Ocean Athlete v2) — NON-NEGOTIABLE

Set by Omer, 2026-08-21. These override any conflicting guidance in the v2 design.

1. **NOTHING IN V1 GETS DELETED.** No screen, route, component or table is removed or
   rewritten just because v2 redesigns it. v2 is **additive**. If a v2 screen replaces a v1
   screen, the v1 screen stays reachable until Omer explicitly retires it. When in doubt,
   add alongside — never in place of.
2. **Two form factors, both first-class:**
   - **Laptop is the coach surface.** Omer uploads clips, writes debriefs and runs the
     clinic day from a laptop. The coach dashboard must be genuinely good at ≥1280px,
     not a stretched phone layout.
   - **Mobile is the athlete surface.** Students use the app on a phone. The v2 canvas is
     drawn at 390px, which is the athlete's world.
3. **Both dashboards must work in both form factors.** Coach on a phone (on the beach)
   and student on a laptop both have to work. Responsive, not two codebases.
4. **Missing screens:** the v2 canvas does not cover everything. Where a screen is missing,
   either (a) list it for Omer and he will design it, or (b) derive it from the existing v2
   design language. Always show him the list first — do not silently invent.

---

## 6 · Ocean Athlete v2 design

Source canvas: `/Users/omershoval/Downloads/Ocean Athlete v2.html` (1.35 MB bundled export).
Decoded working copy: `scratchpad/design.html` (113 KB).

**It is a book.** Clinics are *volumes* rendered as spines on a shelf; published debriefs are
*chapters*; the student side is a real e-reader — Literata serif, font stepper
`[15.5, 17, 18.5, 20.5]px`, three themes, bookmarks, TOC with live %, page-of-38 and
minutes-left footer, progress computed from scroll position.

**One 390px mobile artboard.** 7 full screens cross-faded + 4 bottom sheets over a scrim + a toast.
No desktop layout anywhere in the file. No Hebrew anywhere — every string is English.

### What v2 covers

| Screen | Side | What it is |
|---|---|---|
| `libS` Library | student | the shelf — volumes, currently-reading bar |
| `readS` Reader | student | chapter reading, the heart of the redesign |
| `tocS` Table of Contents | student | chapter list + live % + goal-path outline |
| `todayS` Today | student | full program & streak |
| `backhomeS` Back Home | student | companion after the clinic |
| `askS` Ask Omer | student | sheet |
| `coachS` Coach Desk | coach | the debt dashboard — drafts, inbox, clips, analytics |
| `athS` Athlete Sheet | coach | the 5-second pre-water briefing |
| `tgS` Session Tagger | coach | intake: clip → movement tag → voice note → draft |
| `composerS` Composer | coach | output: draft → student prose → publish |

### MISSING SCREENS — v1 has these, v2 does not cover them

Under rule §5a.1 none of these get deleted. Each needs a decision: **you design it**, or
**I derive it** from the v2 language.

**Coach — the authoring tools, all absent from v2:**
1. **Debrief editor** — `debrief-editor.tsx` (856 lines), the 5 arc blocks. v2's Composer is
   chapter *prose*, not the block editor. This is the core authoring tool and it has no v2 form.
2. **Add / edit student** — `student-form.tsx`. v2 shows "+ add student" as dead text.
3. **Video library** — `/coach/library` (504 lines). v2's "Clip Vault" tile has **no click handler**.
4. **Inbox** — `inbox-view.tsx`. v2's "Inbox" tile is also **dead**.
5. **Analytics** — v2 shows 71% habits / 6-of-11 path steps, but nothing sits behind the tile.
6. **Strategy builder** — React Flow canvas + 7 node components (~2,000 lines). No v2 equivalent.
7. **Training editor** — `training-editor.tsx`. No v2 equivalent.
8. **Back-home editor** — `back-home-editor.tsx`. No v2 equivalent.

**Student:**
9. **Patterns trail** — `pattern-trail.tsx` (1,131 lines). v2 only has `olS`, a collapsible
   outline inside the TOC — not the trail.
10. **Strategy view** — `strategy-view.tsx`. No v2 equivalent.

**Both:**
11. **Login screens** — neither student nor coach login exists in v2.
12. **Every laptop layout.** The canvas is 390px only. Per §5a.2 the laptop is the coach's
    primary surface, so the coach side needs a desktop composition that the canvas does not
    provide. Biggest single gap.

### Data the schema cannot supply yet

Athlete sheet: **stance** (goofy/regular), the **coaching-psychology note**, and a *structured*
priority cue (`focus_skill` is one free-text field; the design wants movement + quoted cue).
Coach desk: a **clinic-day counter** ("Day 9"), an AM/PM **session** concept, a habit
**denominator** (`completed_habits` is a bare `text[]` with no habit-definition table), and
per-node **path-step completion** (`build_strategy` is opaque jsonb).
Reader: **reading progress, bookmarks, reader prefs, private notes, drill checklists,
highlight ranges, figure captions, chapter read/unread**.

### Build status

- [x] **Step 1 — foundation.** `app/v2-tokens.css`: three themes as CSS vars, every rule scoped
      under `[data-v2]`. Literata + IBM Plex Mono added beside the v1 faces. Commit `18a9aeb`.
      The attribute appears nowhere yet, so this is a no-op for every existing screen.

---

## 7 · Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-08-20 | Refine, don't rebuild | Auth is wrong in 3 files; a rebuild forfeits ~⅓ of 40 commits of device-specific video fixes with no tests to catch what breaks |
| 2026-08-20 | AI pipeline = separate service | Durable multi-hour jobs with a human gate; greenfield either way |
| 2026-08-20 | Auth option O1 (harden bespoke), not Supabase Auth | Keeps all 22 call sites compiling, logs nobody out, no magic-link round-trip on bad signal |
| 2026-08-21 | Completed-clinic athletes stay searchable | Year-round vault access is a stated business objective |
| 2026-08-21 | PINs are mandatory | The only way to close credential-free login while keeping the name-typeahead UX |
| 2026-08-21 | Build in this repo, driven from Claude Code | Same working tree as Antigravity; the constraint is one driver at a time, not which tool |
