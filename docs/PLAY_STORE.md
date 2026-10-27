# Nura — Google Play release checklist

App: **Nura** · package `tech.buildc3.nura` · version **1.3.1 (versionCode 9)** · minSdk 29 · targetSdk 36

## 1. The file to upload
`twa/app-release-bundle.aab` (git-ignored; rebuild with `./gradlew bundleRelease`, then sign with jarsigner, alias `nura`).
Signed with the **upload key** (`~/nura-signing/nura-upload.jks`, SHA-256 `32:B3:5B:22:EA:7B:70:D4:…:3C:12:3E:B0`).
Turn on **Play App Signing** at first upload. **Back up `~/nura-signing/` first.** Losing the upload key means a support request to reset it.
Every new upload needs a higher versionCode (`twa/app/build.gradle`).

## 2. Store listing
- Public pages: Privacy `https://dietbuddy.buildc3.tech/privacy` · Delete account `https://dietbuddy.buildc3.tech/delete-account` · Terms `/terms`
- Contact email: **needed in the listing and the privacy policy — owner to choose** (not published anywhere yet).
- Category: Health & Fitness (or Food & Drink). Free, no ads, no in-app purchases.
- Screenshots: phone portrait — Welcome, Home, Scanner, Plan, Activity (live workout), Profile.
- Short description: "Track meals, water and workouts. Scan food with AI. Safe targets for the whole family."

## 3. App content declarations
| Form | Answer |
|---|---|
| Ads | No |
| Target audience | 13+ (the app has family profiles for kids managed by a parent; do NOT select "children" as the audience) |
| Data safety | see below |
| Health apps declaration | Nutrition & weight tracking; fitness/activity tracking |
| Health Connect | see below |
| Account deletion | In-app: Profile → Delete Account. Web URL: `/delete-account` |
| Content rating | Everyone; no user-generated public content |
| Financial features | None (payments are disabled; "Premium coming soon" is text only) |

### Data Safety (collected, all encrypted in transit, deletable by the user)
- **Personal info:** email, name (account)
- **Health & fitness:** weight/height/age/sex, meals & calories, water, workouts, **steps** (live workouts + optional Health Connect), active calories
- **Photos:** meal/fridge photos you choose to scan (sent to AI analysis; small thumbnail kept in your log)
- **Audio:** voice input is processed by Android speech recognition; Nura stores only the text
- **App activity / diagnostics:** feedback you send. No location, no contacts, no advertising ID
- Shared with third parties: AI provider receives scan photos/text for analysis only (service provider). Not sold.

### Permissions to justify
- `CAMERA` — scanning food and barcodes
- `RECORD_AUDIO` — voice meal entry
- `POST_NOTIFICATIONS` — meal and water reminders
- `ACTIVITY_RECOGNITION` — counts steps during a workout the user starts (phone step sensor). Not read at any other time
- Health Connect read: `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_EXERCISE`, `READ_WEIGHT`, `READ_HEALTH_DATA_IN_BACKGROUND` (hourly sync after the user pairs). Rationale screen exists (`ACTION_SHOW_PERMISSIONS_RATIONALE`)
- Exact alarms are NOT used (`setAndAllowWhileIdle`)

## 4. Testing track
Personal developer accounts created after Nov 2023 must run a **closed test with 12+ testers for 14 days** before production. Start one now with testers' Gmail addresses.

## 5. Review risks to expect
- "Minimum functionality" / WebView wrapper: the app is a WebView shell, but it has real native features (reminder alarms, Health Connect, step sensor, voice). Mention these in the release notes and the review notes.
- Reviewer sign-in: create a test account and put the email/password in "App access" (Play Console → App content → App access).
- The site shows only a download page in a browser; the app itself works only inside the Android app. Tell reviewers to use the installed app.

## 6. Owner to-dos still open
Rotate the Neon DB password (old one is in git history) · back up `~/nura-signing/` · pick a public contact email · remove unused `OPENAI_API_KEY`.
