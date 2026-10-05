# Validation and release status

## Current: four-mode preview v4.0.0 (21 September 2026)

- **96 unit/database tests passed**, including migration of pre-existing workouts, legacy queue defaults, immutable session mode, isolated per-mode totals, practice exclusion, non-retroactive ranking promotion, retries, midnight attribution, wrong exercise rejection, and ten analytic cycles for each mode. Existing standard tracking/counter regression tests still pass.
- **28 unique browser cases passed** across desktop Chrome and Pixel-sized Chrome emulation (26-case suite plus new-mode replay coverage and targeted mode/layout reruns). All four modes have selected-mode dashboard/history/global/group filters; profiles show four lifetime totals. Analytic replay verifies knee/crunch/sit-up counters through the UI, mode locking and finish labels. No real camera footage is used by these tests.
- TypeScript and production compilation passed. Phone visual inspection caught and corrected an oversized exercise SVG. Front/rear selector, voice coaching, full-preview alignment and supported zoom controls remain.
- MediaPipe Full worker now returns image/world landmarks, provided visibility/presence, timestamps and inference duration. No mid-repetition model switching.
- Google-reference normalized mirrored k-NN, timestamp smoothing and score hysteresis are implemented. **Classification is inactive**: compatible real training/tuning/evaluation data is not yet acquired. 3D is comparison-only. Empty mode manifests in `references/v1` explicitly record this gap. No synthetic examples are represented as trained data or camera accuracy evidence.
- Standard v3.1 logic is retained, with source copies for replay/rollback. New knee/crunch/sit-up configurations remain **experimental practice** and are stamped unranked by the server. Practice can contribute to personal per-mode history/totals after Supabase is configured, but not competition scores.
- `/research` extracts consented local video with the same worker and exports landmarks locally. Benchmark reports compare baseline, candidate geometry and optional 2D/3D classifiers with person/recording split checks. Actual reference benchmark results: **not run (no agreed recordings)**.
- Required before accuracy promotion: exact counts on agreed real 10-repetition sequences for each mode, zero accepted reps on invalid reference sequences, reviewed false tracking interruptions, physical Android Chrome and iPhone Safari measurements. These remain **pending**. The user's phone counting issue is not claimed resolved.
- Hosted preview still uses explicitly labelled sample activity/rankings. Supabase, Google OAuth and two-account live end-to-end validation remain unconfigured/pending. Apply both migrations in order when connecting Supabase.

Earlier sections below describe historical releases and their test counts.

## Completed locally

- Production compilation with Next.js 16.3.5 and TypeScript.
- **28 unit/database tests:** full repetition cycles; shallow and partial reps; bent hips/knees; wrong orientation; jitter; missing/duplicate frames; pause/reset; Malaysia midnight and leap dates; account isolation; no direct counter writes; one active session; ownership; sequential timestamps; replay deduplication; rate-limited invites; group membership and owner permissions; equal ranks; group cutoff timing; idempotent finish; avatar path policies.
- Database tests execute the actual migration in an embedded PostgreSQL engine (PGlite). Authentication identity and storage schemas are test harness fixtures; this is not a live Supabase integration test.
- **16 Playwright browser tests:** desktop Chrome and Pixel-sized Chrome emulation, all main routes, no horizontal overflow, calendar selection, sample group creation, preview nickname editing, unconfigured/cross-origin API rejection, denied camera access, real model initialization/inference with synthetic blank frames, pause/finish behavior, and automated WCAG A/AA accessibility scans across all seven screens.
- Browser camera tests use a generated canvas stream, not a physical camera or person. They prove that the model loads and runs; they do not measure push-up accuracy.
- Visual review of desktop and 390px phone layouts.
- Production npm dependency audit: no reported vulnerabilities at the time of testing.

## Not completed; required before release

1. Create and connect Supabase and Google OAuth to the existing Vercel project. Apply the migration, configure SMTP and redirect URLs, and redeploy.
2. With two real accounts, verify email signup/verification, Google login, password recovery, sign-out, avatar upload, profile persistence, different users' private history, group joining/removal and global/group rankings.
3. Verify disconnection and recovery on a real account: count reps, disconnect, finish, reconnect, retry, and confirm each repetition appears exactly once. Repeat with browser reload and a concurrent tab. Do not clear local storage during the test.
4. Verify at least two physical Android/Chrome and iPhone/Safari devices. Check landscape/portrait camera framing, actual frame rate, thermal behavior, permission denial/recovery and background/resume.
5. Use consented reference sequences from multiple people, camera distances and lighting conditions. For each clip, record the human-labeled accepted and rejected repetitions, app counts and reasons. Do not upload or commit identifiable footage without consent.
6. Reference cases must include: 10 clean repetitions; 5 shallow reps; 5 knee reps; 5 hip-sag/pike attempts; partial returns; a held plank; a person walking through frame; tracking loss at the bottom; return after pause; a second person; a near-midnight session. Require exact counts on agreed clean sequences and zero accepted invalid attempts before calling the counter field-validated.
7. Tune detector thresholds based on these trials, rerun automated checks, deploy the verified preview, then promote it to production.

## Operational behavior

- Application errors log event names and error codes, never camera frames, email addresses or credential values.
- Unsynced counts stay in a per-account local queue and are excluded from public totals until accepted by the server. Initial session creation requires a connection. Sessions are limited to four hours.
- Client-side detection is not cryptographic verification; a determined user can forge requests. No prizes or high-stakes judging should rely on it.
- The side-on detector uses geometric estimates. It cannot conclusively distinguish every incline, floor surface or replay; those limits are described in the workout screen and README.
- Update, 20 September 2026: the sample-data preview is now hosted at https://pushup-indol.vercel.app in the user's existing Vercel account. Supabase, real account integration, and physical-camera accuracy validation remain incomplete. See DEPLOYMENT.md.

## Phone tracking update, 20 September 2026

Historical v2 behavior below; the v3 section supersedes its duplicate filtering and setup timings.

- User-reported issue: false multiple-person warnings and whole-body visibility warnings on a phone. No reference footage was supplied, so the specific real-world failure has not been reproduced.
- Full pose model with GPU initialization and CPU fallback. Camera input requests 960×540 rather than 1280×720. All image processing remains on device.
- Ignore low-confidence torso detections; merge near-identical skeletons only when at least eight corresponding confident landmarks are each within 8% of body length. Distinct bodies still block counting. This heuristic needs real-camera evaluation, particularly overlapping people.
- Stabilize the selected body side. Require arm visibility ≥0.5, leg visibility ≥0.35 and a combined confidence ≥0.55 rather than requiring every landmark ≥0.65. Finite coordinates and full near-side framing are still required.
- Time-based smoothing; preserve already observed phases through tracking interruptions up to 350 ms. Longer loss requires a fresh top. A missing bottom is never inferred. Model frame gaps above 900 ms also reset the cycle.
- Initial straight-arm hold ≥155° for 250 ms; return threshold uses the initial observed top minus 12°, clamped to 150–165°. Bottom tolerance ≤100° plus shoulder height, a ≥50° excursion, and a temporal descent. Hip/knee thresholds ≥155°. No bottom hold required. These are camera-error tolerances, not universal form standards.
- 42 unit/database tests and 16 browser tests passed after this update, including duplicate skeletons, distinct people, far-side occlusion, modest leg confidence, stable side choice, continuous movements, lower inference rate, tracking-loss recovery, and the actual Full model running on blank synthetic camera frames.
- No measured accuracy percentage is claimed. Physical Android/iOS camera checks and consented reference repetitions are still required.

## Tracking v3.0.0, 21 September 2026

- User confirmed a front-facing body position and no camera selector on their phone. Side-view support was explicitly selected. The new guide explains body position separately from the choice of selfie/rear lens, and shows a version marker.
- Tracking now associates an athlete geometrically across frames. New tracks and confirmed multiple people reset the repetition cycle and calibration. No biometric identification or camera imagery is stored.
- Duplicate suppression requires six corresponding confident joints, including two torso joints. Torso discrepancies must be below 8% of body length, median joint discrepancy below 6%, and at least 80% of joints below 12%. All distances account for camera aspect ratio. This tolerates a noisy extremity without merging on bounding-box overlap alone.
- Distinct second detections must remain geometrically continuous for 500 ms before a multiple-person warning. Ambiguous frames pause evaluation immediately. Short interruptions preserve only phases actually observed; after 350 ms a fresh top is required. Missing depth is never invented.
- Setup and initial straight-arm calibration each require 500 ms of continuous valid evidence. Internal tracking results expose status, track ID, missing joints, setup readiness, and camera-angle/arm/feet checks. Public APIs and database schemas are unchanged.
- Regression coverage includes 10 analytic landmark cycles with transient extra detections, persistent/intermittent additional people, identity changes, long absence, duplicate timestamps, duplicate skeletons with noisy/occluded limbs, front-view guidance, joint-specific feedback, and the existing valid/invalid repetition scenarios.
- Browser coverage adds portrait/landscape panel containment, camera selector and version marker, plus analytic landmark replay through the real UI counter. Real-model browser tests still use blank generated frames; analytic replay replaces inference for that test and is not an accuracy measurement.
- **Physical-phone acceptance is pending:** refresh the deployed workout page, confirm Tracking v3.0.0, place the camera beside the body, tap Start counting and hold straight arms briefly. Perform 10 standard repetitions. Record expected count 10, actual count, and whether false multiple-person warnings occurred. Do not call the reported issue resolved until it passes. No footage upload is needed.

- Final automated result for v3.0.0: 60 unit/database tests and 20 browser tests passed. Production compilation passed. Mobile visual review confirmed the camera panel and guide fit a 390px viewport. Physical iPhone/Android acceptance remains pending.

## Distance coaching v3.1.0

- Added opt-in voice coaching with an explicit test button, accepted-rep announcements, depth/readiness cues, throttled sustained warnings, cancellation on pause/background/finish/unmount, and an unavailable/error fallback. Cues use browser speech synthesis, preferring local English voices. No microphone or video upload is involved.
- Accepted counts take priority over any existing utterance; nonurgent cues never build a delayed speech queue. Warning speech requires 700 ms persistence and has a five-second cooldown. Visual feedback and counting do not depend on speech availability.
- Added a large accepted count and enlarged feedback in the camera preview; the full video and overlay retain identical contain sizing. Added landscape guidance and a widest-view button only for cameras exposing zoom capabilities. Changing zoom before starting resets tracking. Missing current zoom is not treated as proof that the widest view is selected.
- Added coaching/zoom unit tests, browser speech stubs verifying an accepted count is spoken and displayed, opt-out and unavailable behavior, and mocked zoom capabilities/constraints alongside the real model's synthetic-camera test.
- Phone speaker audibility, physical ultrawide lens availability, and full-body field accuracy still require testing on the user's device. Browser speech tests verify calls, not human audibility.

- Final v3.1.0 checks: 65 unit/database tests, 22 browser cases and production build passed. Updated zoom assertions passed separately on desktop and mobile Chrome emulation after one browser page-setup timeout was retried. Speech was stubbed in automated tests; physical audibility and lens selection remain device-dependent.
