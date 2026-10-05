# PushUp

A responsive fitness app with private, on-device exercise counting, daily leaderboards, invite-code groups, date-based activity, and personal profiles.

## Start locally

Requires Node.js 22 or later and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. Without environment variables, the app opens a clearly labeled sample preview. Camera practice uses the actual local pose model; practice results do not affect sample history or leaderboards. Preview profile/group edits last only for the current page visit.

To enable accounts and persistence, follow **[SETUP.md](SETUP.md)**. The repository includes the SQL migration and local model/WASM files; no video upload service or service-role key is required.

## Verify

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests use installed Google Chrome by default (desktop and mobile emulation). Set `PLAYWRIGHT_CHANNEL` to another installed channel if needed, or install Chrome. Tests must run against unconfigured preview mode. They use synthetic video, never the computer's physical camera.

## Architecture

- Next.js App Router + TypeScript; server-side Supabase cookie authentication.
- Supabase PostgreSQL and authenticated, security-definer RPCs with explicit ownership checks. RLS prevents direct mutation of workouts, events, profiles, groups and memberships.
- MediaPipe Pose Landmarker runs in a worker. Video remains on the device. Only accepted repetition sequence numbers and elapsed times are submitted.
- One active workout per account; idempotent event batches; device-local retry queue; server-owned start time and chronology checks.
- All competition days use Asia/Kuala_Lumpur. Reps spanning midnight belong to their completion dates. Group totals use the current membership's join time.
- Supabase public avatar bucket stores only cropped profile photos. Emails and private session details are not included in leaderboard responses.

## Important limits

This is an implementation with automated verification, not a released, field-validated fitness judge. On-device pose estimation and client-originated events are appropriate for friendly competition, not cash prizes or adversarial verification. The camera cannot reliably prove floor contact or defeat replayed footage. Incline positions that appear horizontal from the camera can be ambiguous.

The sample preview is hosted on Vercel. Live OAuth, email delivery, account persistence, and physical iPhone/Android camera trials still require your service accounts and test devices. Read **[VALIDATION.md](VALIDATION.md)** for the release checklist and completed checks.

## Phone tracking v3.1.0

Open `/workout` and confirm **Tracking v3.1.0** appears above the camera. Place the phone beside your body: selecting the selfie/front camera does not mean facing your body toward it. Use the illustration and the three live position checks. Tap Start counting, hold a straight-arm plank for half a second, then perform full repetitions.

For use farther from the screen, turn on **Voice coaching**, raise your media volume, and use **Test voice** before starting. Coaching announces readiness, bottom depth ("Push up"), accepted numbers and sustained warnings. Voice is opt-in and stops on pause, backgrounding, finish or leaving the page. It uses browser speech synthesis and prefers a local English voice; availability and audible output depend on the phone/browser. No microphone permission is requested. A large accepted count and larger feedback also appear over the uncropped camera preview.

Turn the phone sideways to fit the body across the frame. When the browser exposes camera zoom, **Use widest camera view** selects its reported minimum before a session, then resets tracking. The app verifies the reported setting and explains unsupported/unverified zoom. It cannot guarantee access to an ultrawide lens or create a wider physical field of view.

The tracker follows an athlete across frames, filters near-duplicate skeletons and pauses during ambiguity. A distinct additional person must persist for 500 ms before the multiple-person warning appears. Interruptions longer than 350 ms, a changed athlete track, or confirmed multiple people require a fresh top position. No unseen depth is inferred. Missing wrists, feet and other joints receive specific feedback.

All tracking runs locally. Geometric continuity is not biometric identity, and overlapping bodies or reflections can remain ambiguous. Real phone accuracy is pending the user's 10-rep side-view trial.

## Project map

- `src/components/`: responsive pages, camera flow, profile cropping, accessible dialogs.
- `src/lib/tracking.ts`: geometry, person continuity, duplicate filtering, positioning checks and tracking version.
- `src/lib/pose.ts`: smoothing and repetition state machine.
- `src/workers/pose.worker.ts`: local pose model initialization and inference.
- `src/app/api/`: authenticated application and avatar interfaces.
- `supabase/migrations/001_pushup.sql`: tables, access controls, RPCs and storage policies.
- `tests/`: detector, date, SQL, and browser tests.

The model/WASM files can be restored with `node scripts/prepare-model.mjs`. The MediaPipe model is downloaded from Google's official model distribution; see **[THIRD_PARTY.md](THIRD_PARTY.md)**.

## Four-mode preview v4.0.0

Standard push-up, knee push-up, crunch and full sit-up each have separate history, lifetime totals and ranking filters. Knee/crunch/sit-up counters are experimental practice only; server-owned eligibility excludes them from live ranking. All hosted rankings remain sample data until Supabase is connected.

Google-style normalized k-NN classification is implemented but not promoted: compatible real training data and physical-phone evidence are missing. The existing standard detector remains active. World landmarks are returned by the worker; 3D classification is evaluation-only. See /validation, /research and references/README.md for local extraction, split validation, benchmark and promotion steps. Apply both SQL migrations in order.
