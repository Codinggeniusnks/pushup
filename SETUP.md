# Connect accounts and publish PushUp

The app currently runs as a preview because Supabase and Google OAuth are not configured; Vercel hosting is already connected. These steps enable the actual multi-user service.

## 1. Create the database and authentication service

1. Create your own project at [Supabase](https://supabase.com/dashboard). Keep its database password private.
2. Open the SQL editor and run the complete `supabase/migrations/001_pushup.sql` file once in the new project, then run supabase/migrations/002_exercise_modes.sql in order. It creates profiles, workouts, rep events, groups, memberships, rate limiting, account bootstrap, and the avatars bucket.
3. Under project API settings, find the project URL and **publishable key**. These two values are intended for the frontend; never substitute a `service_role` or secret key.
4. Copy `.env.example` to `.env.local` and enter:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
```

5. Restart the app. You should now see sign-in rather than sample data. Empty personal accounts start at zero.

## 2. Configure email accounts

- Enable email/password authentication and email confirmation. Set a minimum password length of 8 or more.
- Set the local Site URL to `http://localhost:3000` while developing.
- Add these local redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/login?mode=reset`
- Configure your own SMTP provider for real users. Supabase's default email service is limited and should not be treated as production email delivery.
- For confirmation links that work on another device, set the confirmation email link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm email</a>
```

- For password recovery, use:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

These routes exchange the single-use token server-side and establish the session. The standard PKCE `/auth/callback` route is also implemented.

## 3. Enable Google sign-in

1. In your own [Google Cloud console](https://console.cloud.google.com/), configure the OAuth consent screen and create a Web application OAuth client.
2. Add Supabase's callback URL as an authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
3. Enable Google in Supabase Auth providers and enter the Google client ID and client secret there. The Google client secret does **not** go into this app or the browser.
4. While the Google app is in testing mode, add the accounts you will use as test users. Complete the required Google publishing steps before general use.

## 4. Deploy a preview to Vercel

1. Put this project in your own Git repository, excluding `.env.local`, `node_modules`, `.next` and test artifacts (already covered by `.gitignore`). Keep `public/models`, `public/wasm`, and the lockfile.
2. Import the repository into [Vercel](https://vercel.com/new). Choose the Next.js preset and Node.js 22 or newer. If the app is inside a larger repository, choose this app's folder as the root directory.
3. Add the two environment variables from step 1 to the appropriate preview/production environments.
4. Deploy. Build command: `npm run build`.
5. Add the exact HTTPS preview origin's callback URLs to Supabase's redirect allowlist. If using the token-hash email templates, set the Site URL to the preview origin during preview testing.
6. Use two real test accounts to verify the checklist in `VALIDATION.md` before promoting the deployment.

## 5. Production settings

- Set Supabase's Site URL to the production HTTPS origin; add the production `/auth/callback` and reset redirect URLs.
- Use a separate Supabase project for staging if you want previews isolated from live records. Apply the same migration there.
- Remove unused preview redirect URLs. Keep keys in environment settings and never commit private credentials.
- Validate on physical iPhone/Safari and Android/Chrome. Localhost camera testing works on this computer; a plain HTTP LAN IP normally cannot access a phone camera. Use the HTTPS deployment for phone testing.
- The app does not require any Vercel cron job. Daily rankings are date queries rather than destructive midnight resets.

## Troubleshooting

**Still seeing sample data:** both public environment variables must be present when Next builds. Redeploy after changing them.

**“Database isn't ready”:** run the migration in the same Supabase project referenced by the environment variables.

**Google callback error:** check Google provider settings, test-user access and exact allowed redirect URLs.

**Email does not arrive:** inspect Supabase authentication logs and your SMTP provider; check spam and email limits.

**Camera unavailable:** use HTTPS/localhost, enable browser camera permission, and close other apps using the camera. For low confidence, improve lighting and show the full body from the side.

**Workout pending:** reconnect on the same device and account, open Workout, then retry syncing. Do not clear browser data while unsynced reps remain. The app does not promote unsynced counts into rankings.

**Avatar upload fails:** check that the migration created the `avatars` bucket and storage policies. Server uploads re-encode cropped photos as 512×512 WebP.

## Reference

- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Google provider](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Vercel Next.js deployments](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [MediaPipe pose landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)
