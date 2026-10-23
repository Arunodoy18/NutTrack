# Nura — nutrition tracking for the whole family

Nura is an **Android app** (photo / barcode / text logging, offline-first, child-safe targets, meal plans, reminders, Health Connect sync).
There is no website version: the web address only hosts the download page and the app's backend.

- **Download page:** https://dietbuddy.buildc3.tech — the only thing a browser ever shows is this page (info, live demo, the APK). Nura itself is an Android app and opens only inside it.
- **Latest app (APK):** https://dietbuddy.buildc3.tech/nura.apk — version and SHA-256 are in [`public/app-release.json`](public/app-release.json)
- **Health check:** https://dietbuddy.buildc3.tech/api/health → `{ ok, rateLimit, commit }` (which commit is live, and whether Redis rate limiting is connected)

## How it fits together
| Part | Where | Notes |
|---|---|---|
| Server + app screens | `app/`, `components/`, `lib/` | The backend and the screens the Android app displays. Next.js 16 (webpack build for `next-pwa`), React 18, Drizzle ORM → Neon Postgres, NextAuth (JWT). Deployed by Netlify on every push to `main`. |
| Android app | `twa/` | Native WebView shell (Java + one Kotlin file), minSdk 29. Adds `NuraApp/<version>` to the user agent and sets a `nura_app` cookie: the server serves the app's screens only to that. Native extras: camera/mic, voice input bridge, downloads, alarm-based reminders, Health Connect sync. |
| Gate | `middleware.ts`, `lib/appGate.ts` | Browsers get `/download`; the app (UA or cookie) gets the real screens. APIs are not gated (they require auth). |
| Download page | `app/download/`, `components/landing/` | Includes a live demo that runs the real food DB, nutrition engine and meal planner in the browser. |
| Reminders | `lib/reminders.ts`, `app/api/device/*`, `twa/.../ReminderAlarms.java` | The server says when to wake the phone; Android alarms (not background jobs, which Android throttles for unopened apps) fetch what is due and show it. |
| Rate limiting | `lib/rateLimit.ts` | Upstash Redis. Without it every limit fails open (check `/api/health`). |
| Plans | `lib/plan.ts`, `lib/scanQuota.ts` | Free plan: every feature, **10 AI scans/day per account** (photo, typed/voice, fridge; resets at the user's midnight; given back if the AI fails on our side). `FREE_DAILY_AI_SCANS` is the one number to change. No purchase flow yet: Profile shows "Premium coming soon" + a "tell me" button (recorded as feedback category `premium`). Payment endpoints return 410. |

## Environment (names only, set in Netlify and `.env.local`)
`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `VAPID_*` (legacy web push). `COMMIT_REF` is provided by Netlify.

## Everyday commands
```bash
npm run dev            # next dev --webpack is needed because next-pwa uses webpack
npm test               # unit tests (tsx --test tests/*.test.ts)
npx tsc --noEmit       # type-check
npm run build          # production build (uses --webpack)
```

## Test suites that run against production (disposable accounts, cleaned up after)
```bash
node scripts/qa/regression.mjs   # 33 end-to-end checks: gate, auth, privacy between accounts, sync, activity, reminders, export, payments off
node scripts/qa/abuse.mjs        # 33 "how real users break it" checks: parallel taps, odd emails, hostile text, stale sessions, floods
node scripts/qa/ratelimit.mjs    # proves rate limiting is on (burst of wrong pairing codes gets 429)
node scripts/qa/cleanup.mjs      # deletes any leftover QA accounts
```
Heads-up: the limiter counts refused attempts too and weighs the previous 15-minute window, so wait ~15–30 minutes between
back-to-back runs. Device testing helpers: `scripts/qa/driver.mjs` (DevTools driver), `attach.sh`, `mkuser.mjs`, `watch.mjs`,
`db.mjs` (read SQL), `hcwriter/` (test-only Health Connect data writer, never shipped).

## Releasing a new Android build
1. Bump `versionCode` / `versionName` in `twa/app/build.gradle`.
2. `cd twa && ./gradlew assembleRelease bundleRelease` (JDK 17, Android SDK; `assembleQa` builds a minified-but-inspectable build for DevTools testing, never publish it).
3. `zipalign -f 4 …/app-release-unsigned.apk aligned.apk`, then `apksigner sign --ks ~/nura-signing/nura-upload.jks --ks-key-alias nura --ks-pass env:KP --key-pass env:KP` (put the password in `KP`, never in the command line); sign the `.aab` with `jarsigner`.
4. Copy the APK to `public/nura.apk`, write `public/app-release.json` (`version`, `sizeMb`, `sha256`, `file`), copy the bundle to `twa/app-release-bundle.aab` (git-ignored), commit and push. The landing page reads that JSON.
5. Confirm: `curl https://dietbuddy.buildc3.tech/api/health` shows the new commit, and the downloaded file's `shasum -a 256` matches the JSON.

The signing key lives in `~/nura-signing/` (outside the repo). **Back it up**: losing it means no more updates on Google Play.

## Not done yet
- Premium: RevenueCat / Play Billing purchase flow (the limits themselves are done; see Plans) and an iOS app for the App Store.
- Rotate the Neon database password (an old one is in git history); remove the unused `OPENAI_API_KEY`.
- Build-time-only npm advisories in the `next-pwa`/workbox chain, and `drizzle-orm` (identifier-injection advisory, not reachable: user text is never used as a SQL identifier).
