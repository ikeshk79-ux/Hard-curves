# Hard Curves — PRD

## Original problem statement
Build the app described in app/memory/WEB_APP_SPEC.md (file not present; approved plan at /app/plan/plan.md is the source of truth): responsive web app for advanced bodybuilders. You plan training, log workouts with a rest timer, track body measurements and progress photos, and share PR cards. There is also a hidden owner area for Hard.curves.media@gmail.com.

## Architecture
- FastAPI + MongoDB (`server.py`, `defaults.py` = 12 starter exercises and default days, `storage.py` = Emergent Object Storage, `clerk_auth.py`)
- Auth: Emergent-managed Clerk, Google-only. Roles live in db.users (admin via ADMIN_EMAIL, verified, on first sign-in)
- Canonical units are cm and kg; the frontend converts to the units the user chose
- React + react-query, Tailwind dark theme (Barlow Condensed / Archivo / JetBrains Mono), html-to-image for the PR card PNG

## Implemented (2026-06)
- Google sign-in, protected app. Home, Training (plan editor, library, history), Log workout (set table, rest timer, PR detection and card, draft autosave), Measurements, Progress (charts and records), Photos (private upload, compare, soft delete), Profile (units, export, reset, sign out)
- Owner area /owner (long-press logo, admin-only, read-only): totals, athlete search, athlete detail and photo viewer
- Tested: 21 backend pytest cases and full frontend run (iteration_1); follow-up fixes applied
- Size goals (Progress page): target per body part, side, flexed and pumped state; progress counts matching entries only (iteration_2 passed)
- Weekly progress email (Emergent managed email): on by default, can be switched off in Profile, with a "Send preview" button. An hourly cron (.emergent/crons.yml -> POST /api/cron/weekly-email) sends at 6pm Sunday in each athlete's own time zone, which is synced from the browser. The email covers the week's sessions, sets, volume, new records, measurement changes and goals

## Phase 1 — Personalised registration & physique setup (2026-06)
- New users go through /welcome onboarding (height CM | FT/IN stored in cm, units, optional weight, optional full measurement set with 4 conditions, Model 5, review & save). Accounts created before this are treated as completed
- Profile > Physique: height editor, body-weight log (body_weights collection), model picker
- Measurements: Neck, Waist, Hips, Glutes added; "Arms" shown as "Upper arm"; side must fit the body part; Full set mode (POST /api/measurements/bulk)
- DB backup before the phase: /app/backups/db-20261026T184507Z.json; reference images in /app/backups
- Staged for a later phase (not wired yet): /public/model5/front.webp and rear.webp, plus 41 Model 5 exercise pictures in /public/exercises/{exercise-id}.webp
- Tested: iteration_3 (58 backend tests, full onboarding UI); inches bug and label fixes applied afterwards

## Backlog
- P1: link plan days more deeply, full-screen photo viewer for athletes, share link
- P2: weekly progress email, streaks, per-body-part goals
- P2: hard-delete photo objects when the storage API supports it
