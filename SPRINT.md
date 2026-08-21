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

### OPEN DECISION — blocks Step 3 onward, needs Omer

**Which language do the 12 Indonesia athletes read?** The v2 canvas is 100% English: zero
Hebrew characters, no `dir="rtl"`, and neither Literata nor IBM Plex Mono declares a Hebrew
unicode-range. The shipped app has 108 Hebrew strings and live RTL. If the answer is Hebrew,
someone must pick a Hebrew serif that pairs with Literata, and the reader's mono label gutter,
chevrons, bookmark clip-path and vertical spine labels each need a mirroring decision — that is
structural work, not a CSS flip. **Do not build a v2 screen before this is answered.**

Secondary decisions, cheap now and expensive after six screens exist — full list in
`docs/v2/BUILD-PLAN-CRITIC.md`: what a "page" is (one number feeds three bars); reading-progress
semantics (per debrief or per block, sync or local); whether the three themes touch v1 screens;
the v1/v2 URL map and which single navigation shell wins.

### Build order (settled 2026-08-21)

- [x] **Step 0 — DEPLOYED 2026-08-21.** Production is `dpl_3u4fn4zaeHTGspBRQKkv31PAo1qs`,
      main is at `2a03ea5`, pushed to GitHub.
      · `COACH_SESSION_SECRET` added to Vercel production.
      · `noy-bar-lev` PIN set — **9757** (the only live athlete without one; my own change had
        locked them out). Zero live athletes now lack a PIN.
      · Storage hardened, surgically — see the note below.
      · Verified ON PRODUCTION: forged cookie → 401 on data and 401 on the Cloudflare-delete
        route and 307 on the dashboard; `q=%%` → 0 rows; wrong coach password → 401, correct →
        200; dashboard/library → 200; roster → 24 students; student login with no PIN → 401,
        wrong PIN → 401, correct PIN → 200 and the athlete page renders.

      **Storage: what was and was NOT done.** The plan said "make `rca-notes` private." That
      would have broken playback — **7 rows in `student_videos` point at that bucket** and are
      served from `/object/public/`. Instead the three UNCONSTRAINED public policies were
      dropped (`Allow deletes` / `Allow updates` / `Allow uploads` — each let any anonymous
      caller act on ANY object). Safe because the app deletes via the service role, which
      bypasses RLS, and client TUS sends `x-upsert: false`. Kept: `anon_insert_rca_notes`
      (path-constrained, needed for uploads) and `Public read rca-notes` (needed for the 7
      videos). Verified after: anon upload → 400, anon delete → 400, both athlete videos → 206.
      **Still open:** reads are public, so anyone with a URL can still watch any clip. Closing
      that needs signed URLs on the playback path — a real task, not a policy flip.

- [ ] **Step 1 — Settle the contracts above in writing.** No code. Append to §7.
- [ ] **Step 2 — Ingest + save reliability.** THE Aug 31 blocker, and unblocked right now.
      Multi-file dropzone as a NEW surface · hoist `UploadManagerProvider` into
      `app/coach/layout.tsx` · `lib/api-fetch.ts` with `AbortSignal.timeout` · make block saves
      check `res.ok`. Verify: drop 20 clips, navigate away mid-upload and watch them survive,
      force a 500 and see a visible error.
- [x] **Step 3 — v2 foundation, additive and scoped.** `app/v2-tokens.css` (paper/light/abyss,
      all scoped `[data-v2]`), Literata + IBM Plex Mono. Commit `18a9aeb`.
      Two of the four required global fixes are now in the token layer too (`color-scheme: light`,
      and a `:focus-visible` override — without it v1's `--ring: #2fd6c0` draws a TEAL ring on
      cream). Commit `18a9aeb` + the token follow-up.
      Still to do here, and **all four must land before the first v2 pixel**:
      the remaining two global fixes are per-route and belong with the first v2 route —
      a segment `viewport.themeColor` (v1 exports `#070f15`, so a cream page sits under navy
      browser chrome) and painting `html`/`body` with `--v2-bg` (v1's `bg-background` is
      `#070f15`, so iOS rubber-band overscroll flashes navy above and below the paper).
      Then the additive migration for `reading_progress` + `bookmarks` (`docs/v2/MIGRATION.sql`),
      and a Hebrew fallback stack once the language call is made.
- [ ] **Step 4 — The reader, on real data, at both widths.** New route alongside the v1 debrief
      detail, which stays reachable. Render the 13 real debriefs and 65 real blocks — no
      fixtures. Anything needing new authoring degrades gracefully rather than being stubbed.
      Desktop = measure clamp + centered column; dock hides above the breakpoint; sheets become
      centered modals. Verify at 390px and 1440px, and that progress survives a reload.
- [ ] **Step 5 — Library shelf + TOC**, reusing the Step 3 progress store so all three surfaces
      show the identical number. Shelf wraps rather than stretches at 1440px. **Stop here if
      Aug 28 arrives.**
- [ ] **Step 6 — Aug 29 dress rehearsal.** With no tests and no CI this is the only regression
      suite that exists.

### Desktop: settled

**Responsive from the mobile design, one breakpoint (~768px), student surface only. The coach
stays on the v1 dashboard for Aug 31.** The coach's laptop surface already exists and works —
`coach-dashboard-client.tsx` is `md:w-72 / lg:w-80` two-pane and commit `21875ec` verified it at
both 1440x900 and 375x812. The v2 coach screens are not a desktop layout at all; Coach Desk is a
*phone* launcher. The design does not omit the coach's desktop — it adds a new phone coach
surface nobody has time to build. And a reader is the cheapest thing in UI to make responsive,
because a book is a measure-constrained column: clamping prose to ~62–68ch and centering it IS
the desktop layout.

Three things resist a width clamp, each with a cheap answer: the Vault shelf wraps rather than
stretches; the floating dock hides above the breakpoint; the four bottom sheets become centered
modals — one shared container decision, not four.

### Cut for Aug 31 (full reasoning in `docs/v2/BUILD-PLAN-CRITIC.md`)

The entire **phone coach surface** (Coach Desk, Tagger, Composer, Athlete sheet) — the v1
dashboard already satisfies coach-on-laptop *and* coach-on-phone, and rebuilding the 856-line
debrief editor with no tests is the largest regression risk available. **Clip Vault** — depends
on `student_videos.movement_id`, which §4 names as dead schema. **The entire Today screen** and
**Back Home** — `habit_logs` and `translations` both have 0 rows; real work producing guaranteed
empty screens. **Video chapter markers** — needs 3 authored markers per chapter during a live
clinic. **Per-chapter drills with completion**, **annotated stills / captions / inline
highlights**, **private student notes** (an "only you see this" promise that allow-all RLS
cannot keep — do not ship it), **the TOC bookmarks list**, **front-matter chapter and read/unread
ticks**, **the new-chapter and Ask red dots** (need a last-seen marker that exists nowhere),
**two of the three themes — ship Paper only**, and **the Analytics tile**.

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

### Reference docs (read these instead of re-deriving)

| File | What it is |
|---|---|
| `docs/v2/SCREEN-SPEC.txt` | every v2 screen, structure and real copy, verbatim |
| `docs/v2/GAP-MAP.txt` | 52 items mapped to existing files: reskin / extend / build-new / schema-change / conflict, with hours |
| `docs/v2/BUILD-PLAN-CRITIC.md` | desktop verdict, build order, cut list, open questions, sequencing risks |
| `docs/v2/DERIVED-SCREENS.md` | the 12 screens the canvas lacks, derived in its language — **read DERIVED-CRITIC.md alongside it** |
| `docs/v2/DERIVED-CRITIC.md` | corrections that supersede the above, plus the coexistence verdict |
| `docs/v2/MIGRATION.sql` | the additive migration (reading_progress, bookmarks, and the rest) |
| `docs/v2/design-canvas.html` | the decoded canvas — read it in slices, never `cat` it whole |

Totals from the gap map: **52 items, ~260h** — 15 schema-change (73h), 11 reskin (40.5h),
10 conflict (66h), 8 build-new (45h), 8 extend (36h). Only **two** block Aug 31: the multi-clip
ingest surface (14h) and loud saves + toast (3h). Everything else is post-clinic by choice.

### A correction to an earlier call in this file

I previously held the bulk-ingest work "until the v2 design defines it." **That was wrong and it
was burning calendar.** The tagger describes a *per-clip* pipeline — clip → movement tag → voice
note → draft — behind a single ＋ button. It does not define bulk ingest and never will. Step 2
is unblocked and should start as soon as Step 0 is deployed.

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
| 2026-08-21 | v2 tokens namespaced `--v2-*`, not adopted globally | In v1 `--accent` is GOLD and `--primary` is TEAL; in the design `--accent` is TEAL. 29 files reference those names — a global rename would turn every gold surface in v1 teal, violating §5a.1 |
| 2026-08-21 | Desktop = responsive from mobile, one ~768px breakpoint, student surface only | The coach's laptop layout already exists and is verified at both widths; a separate desktop layout doubles the surface area of an untested 17.5k-LOC codebase 10 days from freeze |
| 2026-08-21 | Phone coach surface cut for Aug 31 | v1 dashboard already satisfies coach-on-laptop and coach-on-phone; rebuilding the 856-line debrief editor with no tests is the largest available regression risk |
| 2026-08-21 | Ship Paper theme only for Aug 31 | Removes any risk of the token swap leaking into v1, and only two elements in the whole canvas actually consume `var(--fs)` |

---

## 8 · How to start the next session

Open a new conversation **in this repo** and say:

> Read SPRINT.md and start at Step 1.

`CLAUDE.md` → `AGENTS.md` → points here, so it loads automatically. Antigravity too.

**Step 1 is decisions, not code.** Four things must be settled in writing before the first v2
pixel, and every one of them is cheap now and expensive after six screens exist:

1. **Language** (§2) — does the book survive Hebrew, or is Hebrew a different visual design?
2. **Is `/enter` the door, or a second door?** If it is *the* door, 26 hard-coded
   `redirect("/")` sites under `app/s/*` plus `proxy.ts:29,33,39` get repointed, or every
   session expiry silently lands the athlete back on the v1 login.
3. **Does the login ship before the reader?** Recommendation: no. A paper front door onto a
   dark app is the most visible seam available, and the reader is what athletes open daily.
4. **Widen `/api/students/search`, or accept a flat row?** Without clinic number + location
   there is no clinic-aware meta line and no spine palette. Widen to those two fields only —
   never counts or roster size, which would reopen the harvesting oracle `0276bbb` closed.

Then **Step 2** — ingest + save reliability — is the real Aug 31 blocker and is unblocked now.

### State as of 2026-08-21

- `main` = `9beb611`, pushed. Working tree clean. Production deployed and verified.
- Branch `hardening/aug31` is merged; it can be deleted or kept as history.
- Nothing is half-done: every commit builds, `tsc --strict` is clean, and no v2 route exists yet.
