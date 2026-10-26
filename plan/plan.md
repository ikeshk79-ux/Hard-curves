# Hard Curves — Web App Plan

A responsive web app for advanced bodybuilders to plan training, log workouts with a rest timer, track body measurements and progress photos, and share personal-record cards.
Each athlete's data is private and saved in the cloud; a hidden owner area lets the app owner see all athletes.

## Who it's for
- **Athletes**: advanced bodybuilders who log every set and track arm, chest, leg and other sizes over time, on phone or desktop.
- **The owner** (Hard.curves.media@gmail.com): sees totals and every athlete's data, read-only.

## Core features and experience
- **Sign-in**: Google sign-in only. Nothing in the app is visible before signing in.
- **Home**: "Welcome back, {name}", Start workout button, stat cards (sessions completed, total volume in kg/tonnes or lb, latest arm size, active plan), Up next card, 5 latest measurements, 3 recent workouts, training tip.
- **Training**: editable plan name and training days (defaults: Chest & Triceps, Back & Biceps, Legs, Shoulders & Arms; add a day, save). Library of the 12 starter exercises with muscle, equipment, sets, rep range, rest seconds and RIR. Workout history.
- **Log workout**: session name, pick exercises, set table (load / reps / RIR / done), Add set, "Mark session completed" (on by default), Save.
  - Rest timer starts when a set is ticked, using that exercise's rest time; −15s, +15s, Skip; shows "Rest over".
  - Beating a previous best load on a completed session opens the PR card.
- **Measurements**: body part (Arms, Forearms, Chest, Shoulders, Back, Thighs, Calves), side (Right, Left, Both, Midline), value in in or cm, date (future and impossible dates rejected), flexed/unflexed, pumped yes/no, notes. History with body-part filter chips and delete with confirm.
- **Progress**: stats (workouts, sets, measurement entries, muscles tracked); like-for-like measurement bar chart filtered by body part, flexed and pumped (shown once 2+ entries match); volume per completed session chart; records with best load per exercise and a Share PR card button.
- **Progress photos**: private uploads with date and optional note, grid view, pick two to compare side by side with days between and that day's measurements, delete.
- **PR card**: square branded card ("HARD CURVES", "NEW PERSONAL RECORD", lift, weight, reps, date), download or share as an image.
- **Profile**: display name, plan name, units (imperial in/lb or metric cm/kg), cloud backup status, export all data as JSON, reset all data with confirm, sign out.
- **Owner area** (hidden): totals (users, new and active in last 7 days, workouts, measurements, photos); searchable athletes list (name, email, workouts, measurements, photos, last active); read-only athlete detail with stats, latest measurements, workouts and all progress photos in a full-size viewer.

## User flow
1. Athlete opens the app, signs in with Google, lands on Home.
2. Edits the plan in Training, starts a workout, ticks sets (rest timer runs), saves; a new PR opens the PR card to download or share.
3. Logs measurements and photos over time and checks trends and comparisons in Progress and Photos.
4. Owner long-presses the logo on the sign-in page (~1 second) or goes to /owner, signs in with Google as Hard.curves.media@gmail.com and sees the owner dashboard. Any other account that opens /owner is refused.

## UI/UX feel
- Dark, bold, athletic and premium: background #101113, cards #181A1E, borders #2B2E34, text #F3F4F6, muted #8E949E.
- Lime #C8F169 for buttons and highlights, dark text #171A12 on lime.
- Brand mark: a lime square with a dumbbell icon and the wordmark "HARD CURVES", "CURVES" in lime.
- Works well on a phone at the gym: large tap targets, a visible rest timer and fast set entry.

## Implementation phases
- **Phase 1 — MVP (built now)**: everything in the spec. Google sign-in, all 8 athlete pages, rest timer, PR detection and PR card image, private photo storage, data export and reset, and the hidden owner area.
- **Phase 2**: richer training, e.g. linking plan days to the Log workout screen, a full-screen photo viewer and a share link for athletes.
- **Phase 3**: engagement features, e.g. a weekly progress email, streaks and goal tracking per body part.

## Assumptions
- **Owner sign-in uses Google, not a separate email + password.** You chose Google-only sign-in, and the owner email is a Gmail address, so the owner signs in with that Google account. There is no owner password to hand out. The separate 8-hour owner session and the "lock after 5 failed attempts" rule from the spec are left out, because Google handles login security. The owner pages are still checked on every request, so other Google accounts can never open them.
- The owner role is granted only on the first sign-in of the verified Google account Hard.curves.media@gmail.com. The owner can also use the athlete pages like a regular user.
- Owner access is read-only. The owner cannot edit or delete athlete data.
- Default units are metric (cm/kg) until the athlete changes them in Profile. Values are stored once and shown in the chosen units.
- A PR means a heavier load than the athlete's previous best for that exercise, counting only completed sessions. The first time a lift is logged it sets the baseline and does not count as a PR.
- "Up next" shows the next training day in the plan after the last completed session.
- Training tips come from a fixed set of written tips, with no AI.
- Deleting a photo removes it from the app for everyone, including the owner.
- "Reset all data" wipes the athlete's workouts, measurements, photos and plan and restores the default plan and exercises. The account stays.
- "Cloud backup status" shows that data is saved to the cloud and when the last change was made.
- Photos are limited to common image formats (JPG, PNG, WEBP, HEIC) up to 10 MB each.
- Preview and the published app have separate accounts, so the owner signs in again after the app is published.
