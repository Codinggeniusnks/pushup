# Current deployment

- App: https://pushup-indol.vercel.app
- Status: Tracking v4.0.0-preview deployed on 21 September 2026, in application preview mode.
- Deployment: `dpl_4CM9SKQCkcVWJNWUTqGhNtcsE7JZ`
- Previous standard-only deployment for rollback: `dpl_Fe2RL8k3XyVnv9iYBt5vy6mK2iZN` (v3.1.0).

Four-mode deployment verified: public workout, validation, research and Full-model URLs returned HTTP 200; hosted browser showed Tracking v4.0.0-preview, selectable modes, knee sample score 39 and crunch sample score 50, plus all four profile totals. No browser runtime errors during the hosted smoke check. 96 unit/database tests and 28 unique browser cases passed, as detailed in VALIDATION.md. New detectors remain experimental practice; Google-style classification is implemented but inactive pending real compatible reference data. Apply both migrations before connecting Supabase.

The production Vercel alias currently serves the **sample-data preview**, not a connected multi-user release. Supabase and Google OAuth are not configured. No real workout records or user accounts are stored by the preview.

Verified after deployment: homepage and workout page return HTTP 200; the local pose model and WASM asset return HTTP 200 with appropriate content types. The hosted dashboard was opened and visually inspected.

Tracking v3 verification: the public workout page displays **Tracking v3.0.0** and the front/rear camera selector. The Full model asset returns HTTP 200. Sixty unit/database tests and twenty browser tests passed. Physical phone accuracy remains pending the user's side-view 10-rep test; no measured accuracy improvement is claimed.

`vercel.json` explicitly selects the Next.js framework. Keep this file: creating an empty project through the CLI defaults its framework to Other, which can build successfully but serve a 404.

The local project is linked to this Vercel project. Authentication is kept outside the source deliverable. Never distribute `.env.local` or deployment credentials.

Next: follow SETUP.md to create Supabase, apply the migration, configure authentication, add the public Supabase environment variables to Vercel, and redeploy. Use `https://pushup-indol.vercel.app` as the production Site URL and the corresponding `/auth/callback` URLs in Supabase.

Tracking v3.1.0 verified at the public workout URL: HTTP 200, v3.1.0 version marker and voice coaching controls. Added opt-in spoken cues/counts, larger in-camera count/feedback, and widest-view selection for cameras exposing zoom. 65 unit/database tests and 22 browser cases passed; physical phone audio and lens availability remain unverified.
