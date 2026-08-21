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

### In progress
- [ ] **Ocean Athlete v2 design analysis** — extracting the spec from the design canvas
      and mapping it against the existing code. See §6.

### Next, in leverage order
- [ ] **Upload path unlock** — the change that decides whether night 1 works with 12 athletes.
      `components/coach/video-uploader.tsx`: iterate `accepted` instead of `accepted[0]` (:137),
      raise `maxFiles` 1 → 20 (:217), move the FFmpeg trim behind an opt-in **Trim** button.
      Then drop the `fileChecksum()` full `arrayBuffer()` read in `lib/upload-manager.tsx`
      (it duplicates FFmpeg's own full-file read; a 300 MB clip peaks ~900 MB against an
      iOS Safari ceiling of 1–1.5 GB and the tab dies, taking in-flight uploads with it).
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

## 6 · Ocean Athlete v2 design

Source canvas: `/Users/omershoval/Downloads/Ocean Athlete v2.html` (1.35 MB bundled export).
Decoded working copy: `scratchpad/design.html` (113 KB, real HTML).

What is known so far:
- **One artboard only: 390 px mobile.** There is no desktop layout in the file. Open gap.
- Fonts: **Literata** (serif body — a reading-first shift) + **IBM Plex Mono**.
- Three themes: dark / light / **paper**. This conflicts with the v3 spec's "always dark, no
  light mode" rule — the old rule loses, the design wins.
- Accent `#2FD6C0`, gold `#E0B64F`, error `#FF6B5E`.
- Screens (from state flags): library, **today**, coach, **reader**, TOC, ask, back-home,
  athlete detail, composer, tagger, bookmarks, type settings, digest, outline.
- The reader has a font-size stepper, TOC with % progress, bookmarks and an outline —
  i.e. the Student Book as a genuine **reading experience**. Nothing like it exists today.

*(Spec extraction in flight — this section gets the full screen-by-screen map and gap list.)*

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
